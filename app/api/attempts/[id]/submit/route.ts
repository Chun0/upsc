import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb, saveDb } from "@/lib/store/db";
import { getExam } from "@/lib/content/exams";
import { scoreQuiz } from "@/lib/engine/quiz";
import { applyAttemptToStats } from "@/lib/engine/mastery";
import { buildReportMarkdown, fallbackReportData } from "@/lib/report/template";
import { orchestrator, NoApiKeyError } from "@/lib/ai/orchestrator";
import { REPORT_SCHEMA } from "@/lib/ai/schemas";
import { ctxAnalyzeAttempt } from "@/lib/ai/prompts";
import type { ReportData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Submit flow:
 *  1. deterministic scoring (engine)
 *  2. mastery-map update (algorithm)
 *  3. AI report analysis on the MASTER lane (if keys available)
 *  4. predesigned markdown report card (charts built by code, filled by LLM JSON)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const db = getDb();
  const attempt = db.attempts.find((a) => a.id === id);
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  if (attempt.status === "submitted") return NextResponse.json({ already: true, id });
  const quiz = db.quizzes.find((q) => q.id === attempt.quizId);
  if (!quiz) return NextResponse.json({ error: "quiz missing" }, { status: 404 });

  // merge final answers
  if (body?.answers) {
    const prev = attempt.answers;
    const merged: typeof prev = {};
    for (const [qid, st] of Object.entries(body.answers as Record<string, { selected?: string[]; markedForReview?: boolean; firstSeenAt?: number; lastChangedAt?: number; timeSpentMs?: number }>)) {
      const old = prev[qid];
      merged[qid] = {
        selected: st.selected ?? old?.selected ?? [],
        markedForReview: st.markedForReview ?? old?.markedForReview,
        firstSeenAt: st.firstSeenAt ?? old?.firstSeenAt,
        lastChangedAt: st.lastChangedAt ?? old?.lastChangedAt,
        timeSpentMs: Math.max(st.timeSpentMs ?? 0, old?.timeSpentMs ?? 0),
      };
    }
    attempt.answers = { ...prev, ...merged };
  }

  // 1. deterministic scoring
  const score = scoreQuiz(quiz, attempt.answers, attempt.startedAt);
  attempt.score = score;
  attempt.status = "submitted";
  attempt.submittedAt = Date.now();

  // 2. mastery update
  await mutateDb((d) => {
    applyAttemptToStats(d.topicStats, quiz, attempt.answers, attempt.examId, Date.now());
    d.activity.push({
      date: new Date().toISOString().slice(0, 10),
      type: quiz.kind === "mock" ? "mock" : "quiz",
      examId: attempt.examId,
      label: quiz.title,
      meta: { questions: quiz.questions.length, percent: score.percent },
    });
  });

  // 3+4. AI analysis + report card
  const exam = getExam(attempt.examId);
  let ai: ReportData | null = null;
  let aiError: string | undefined;
  if (orchestrator.hasAnyKey()) {
    try {
      ai = await orchestrator.generateJson<ReportData>({
        lane: "master",
        prompt: ctxAnalyzeAttempt(exam!, quiz, score),
        schema: REPORT_SCHEMA,
        timeoutMs: 240000,
      });
    } catch (e) {
      aiError = e instanceof NoApiKeyError ? undefined : String((e as Error).message || e).slice(0, 200);
    }
  }
  if (!ai) ai = fallbackReportData(score);

  await mutateDb((d) => {
    const a = d.attempts.find((x) => x.id === id);
    if (a) {
      a.reportJson = ai;
      a.aiAnalysis = Boolean(ai && ai.realityCheck && !a.aiError && !aiError);
      a.aiError = aiError;
      a.reportMarkdown = buildReportMarkdown({ attempt: a, quiz, exam, score, ai });
    }
  });

  return NextResponse.json({ id, aiUsed: Boolean(attempt.aiAnalysis), aiError });
}

/** Re-run AI analysis on an already-submitted attempt. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const attempt = db.attempts.find((a) => a.id === id);
  if (!attempt || !attempt.score) return NextResponse.json({ error: "attempt not found or not scored" }, { status: 404 });
  const quiz = db.quizzes.find((q) => q.id === attempt.quizId);
  if (!quiz) return NextResponse.json({ error: "quiz missing" }, { status: 404 });
  const exam = getExam(attempt.examId);
  if (!exam) return NextResponse.json({ error: "exam missing" }, { status: 404 });

  let ai: ReportData | null = null;
  try {
    ai = await orchestrator.generateJson<ReportData>({
      lane: "master",
      prompt: ctxAnalyzeAttempt(exam, quiz, attempt.score),
      schema: REPORT_SCHEMA,
      timeoutMs: 240000,
    });
  } catch (e) {
    if (e instanceof NoApiKeyError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: String((e as Error).message || e).slice(0, 300) }, { status: 502 });
  }
  await mutateDb((d) => {
    const a = d.attempts.find((x) => x.id === id);
    if (a) {
      a.reportJson = ai;
      a.aiAnalysis = true;
      a.aiError = undefined;
      a.reportMarkdown = buildReportMarkdown({ attempt: a, quiz, exam, score: a.score!, ai });
    }
  });
  await saveDb();
  return NextResponse.json({ ok: true });
}
