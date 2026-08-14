import { NextRequest, NextResponse } from "next/server";
import { orchestrator, NoApiKeyError } from "@/lib/ai/orchestrator";
import { getExam } from "@/lib/content/exams";
import { getDb } from "@/lib/store/db";
import {
  MCQ_SET_SCHEMA, VALIDATE_SCHEMA, SCORE_SCHEMA, REPORT_SCHEMA, FLASHCARDS_SCHEMA,
  PLAN_SCHEMA, DIGEST_SCHEMA, DESCRIPTIVE_PAPER_SCHEMA, EXPLAIN_SCHEMA,
} from "@/lib/ai/schemas";
import {
  ctxQuiz, ctxValidate, ctxScoreDescriptive, ctxAnalyzeAttempt, ctxFlashcards,
  ctxPlan, ctxDigest, ctxExplain, ctxDescriptivePaper,
} from "@/lib/ai/prompts";
import { recommendNext, topicKey } from "@/lib/engine/mastery";
import { scoreQuiz } from "@/lib/engine/quiz";
import type { Quiz } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Task =
  | "quiz" | "validate-quiz" | "score" | "report" | "flashcards"
  | "plan" | "digest" | "descriptive-paper" | "explain";

function examOrThrow(examId: string) {
  const exam = getExam(examId);
  if (!exam) throw new Error(`Unknown exam: ${examId}`);
  return exam;
}

interface AiMcq {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: number;
}

/**
 * Unified AI dispatch. Task routing:
 *  - slave (flash-lite/gemma): quiz drafts, flashcards, explain, outlines
 *  - master (flash): quiz validation, descriptive scoring, reports, plans, digests
 */
export async function POST(req: NextRequest) {
  let body: { task?: Task; payload?: Record<string, never> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const task = body?.task;
  const payload = body?.payload || ({} as Record<string, never>);
  const db = getDb();

  try {
    switch (task) {
      case "quiz": {
        const exam = examOrThrow(payload.examId as string);
        const weakTopics = recommendNext(db.topicStats, exam, Date.now(), db.profile?.examDate, 8)
          .filter((r) => r.verdict === "weak" || r.verdict === "unrated")
          .map((r) => r.topic);
        const opts = {
          subject: payload.subject as string | undefined,
          topics: payload.topics as string[] | undefined,
          count: Math.min(30, Number(payload.count) || 10),
          difficulty: Number(payload.difficulty) || 2,
          kind: (payload.kind as string) || "practice",
          section: payload.section as string | undefined,
          weakTopics,
        };
        // Pipeline: slave drafts -> master validates & corrects (multi-agent queue+wait).
        // Each lane is a serial FIFO queue; the master validation WAITS on the slave draft.
        const draft = await orchestrator.generateJson<{ questions: AiMcq[] }>({ lane: "slave", prompt: ctxQuiz(exam, opts), schema: MCQ_SET_SCHEMA, search: false, timeoutMs: 180000 });
        let review: { approved: boolean; corrections: { index: number; reason: string; replacement: AiMcq }[]; notes: string };
        if (orchestrator.masterModel() === orchestrator.slaveModel()) {
          review = { approved: true, corrections: [], notes: "same model for both lanes — validation skipped" };
        } else {
          try {
            review = await orchestrator.generateJson<{ approved: boolean; corrections: { index: number; reason: string; replacement: AiMcq }[]; notes: string }>({
              lane: "master",
              prompt: ctxValidate(exam, JSON.stringify(draft.questions || [])),
              schema: VALIDATE_SCHEMA,
            });
          } catch {
            review = { approved: true, corrections: [], notes: "validation skipped (model error)" };
          }
        }
        let questions: AiMcq[] = [...(draft.questions || [])];
        if (!review.approved && review.corrections?.length) {
          for (const c of review.corrections) {
            if (c?.replacement && Number.isInteger(c.index) && c.index >= 0 && c.index < questions.length) {
              questions[c.index] = c.replacement;
            }
          }
        }
        // programmatic hygiene pass (deterministic) — option count follows the exam's real format
        const optCount = exam.options ?? 4;
        const lastIdx = optCount - 1;
        questions = questions
          .filter((q) => q && typeof q.question === "string" && q.question.length > 3)
          .slice(0, opts.count)
          .map((q) => ({
            ...q,
            options: (q.options || []).slice(0, optCount),
            answerIndex: typeof q.answerIndex === "number" ? Math.max(0, Math.min(lastIdx, q.answerIndex)) : 0,
            explanation: q.explanation || "",
          }))
          .filter((q, i, arr) => i === arr.findIndex((x) => x.question === q.question));
        return NextResponse.json({ questions, validationNotes: review.notes || "" });
      }

      case "score": {
        const exam = examOrThrow(payload.examId as string);
        const out = await orchestrator.generateJson<{ marksAwarded: number; maxMarks: number; band: string; feedback: string; modelAnswer: string }>({
          lane: "master",
          prompt: ctxScoreDescriptive(exam, String(payload.question || ""), String(payload.answer || ""), Number(payload.maxMarks) || 10, payload.wordLimit ? Number(payload.wordLimit) : undefined),
          schema: SCORE_SCHEMA,
        });
        return NextResponse.json(out);
      }

      case "report": {
        const exam = examOrThrow(payload.examId as string);
        const quiz = payload.quiz as unknown as Quiz;
        const answers = (payload.answers || {}) as never;
        const score = scoreQuiz(quiz, answers, Number(payload.startedAt) || Date.now());
        const out = await orchestrator.generateJson<never>({
          lane: "master",
          prompt: ctxAnalyzeAttempt(exam, quiz, score),
          schema: REPORT_SCHEMA,
        });
        return NextResponse.json({ report: out, score });
      }

      case "flashcards": {
        const exam = examOrThrow(payload.examId as string);
        const wrongPairs = (payload.wrongPairs as { q: string; a: string }[] | undefined)?.slice(0, 8);
        const out = await orchestrator.generateJson<{ cards: { front: string; back: string; topic: string }[] }>({
          lane: "slave",
          prompt: ctxFlashcards(exam, payload.subject as string | undefined, Number(payload.count) || 10, wrongPairs),
          schema: FLASHCARDS_SCHEMA,
        });
        return NextResponse.json(out);
      }

      case "plan": {
        const exam = examOrThrow(payload.examId as string);
        const weak = recommendNext(db.topicStats, exam, Date.now(), db.profile?.examDate, 10).map((r) => `${r.subject}: ${r.topic}`);
        const out = await orchestrator.generateJson<never>({
          lane: "master",
          prompt: ctxPlan(exam, { weeks: Number(payload.weeks) || exam.plan.weeks, hoursPerDay: Number(payload.hoursPerDay) || exam.plan.hoursPerDay, weakTopics: weak }),
          schema: PLAN_SCHEMA,
        });
        return NextResponse.json(out);
      }

      case "digest": {
        const exam = examOrThrow(payload.examId as string);
        const out = await orchestrator.generateJson<never>({
          lane: "master",
          prompt: ctxDigest(exam),
          schema: DIGEST_SCHEMA,
          search: true,
          timeoutMs: 180000,
        });
        return NextResponse.json(out);
      }

      case "descriptive-paper": {
        const exam = examOrThrow(payload.examId as string);
        const out = await orchestrator.generateJson<never>({
          lane: "master",
          prompt: ctxDescriptivePaper(exam, Math.min(8, Number(payload.count) || 4), payload.section as string | undefined),
          schema: DESCRIPTIVE_PAPER_SCHEMA,
        });
        return NextResponse.json(out);
      }

      case "explain": {
        const out = await orchestrator.generateJson<never>({
          lane: "slave",
          prompt: ctxExplain(payload.question as never, payload.userAnswer as string | undefined),
          schema: EXPLAIN_SCHEMA,
        });
        return NextResponse.json(out);
      }

      default:
        return NextResponse.json({ error: `Unknown task: ${String(task)}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof NoApiKeyError) return NextResponse.json({ error: e.message }, { status: 400 });
    const msg = String((e as Error).message || e);
    console.error("[ai]", task, msg.slice(0, 300));
    return NextResponse.json({ error: msg.slice(0, 400) }, { status: 502 });
  }
}
