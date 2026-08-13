import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";
import { getExam } from "@/lib/content/exams";
import { miniMockPlan, buildOfflineQuiz } from "@/lib/engine/quiz";
import { orchestrator, NoApiKeyError } from "@/lib/ai/orchestrator";
import { MCQ_SET_SCHEMA } from "@/lib/ai/schemas";
import { ctxQuiz } from "@/lib/ai/prompts";
import { uid } from "@/lib/utils";
import type { Question, Quiz } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Mini-mock assembly: proportional section plan from the official pattern,
 * per-section AI generation on the SLAVE lane (one call per section, serialized
 * through the lane queue to respect rate limits), offline fallback from samples.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.examId) return NextResponse.json({ error: "examId required" }, { status: 400 });
  const exam = getExam(body.examId);
  if (!exam) return NextResponse.json({ error: "unknown exam" }, { status: 400 });
  const offline = Boolean(body.offline);
  const maxQ = Math.min(50, Math.max(10, Number(body.maxQuestions) || 25));

  const pattern =
    exam.patterns.find((p) => p.stage === body.stage && p.questions > 0 && p.mode !== "descriptive" && p.mode !== "interview") ||
    exam.patterns.find((p) => p.questions > 0 && p.mode !== "descriptive" && p.mode !== "interview") ||
    exam.patterns[0];
  const plan = miniMockPlan(exam, pattern.stage, maxQ);

  // ------- offline path -------
  if (offline) {
    const q: Question[] = [];
    for (const sec of plan.sections) {
      const quizPart = buildOfflineQuiz(exam, {
        count: sec.questions,
        kind: "mock",
        sectionName: sec.name,
        marksPerQ: sec.marks / Math.max(1, sec.questions),
        negFraction: sec.negFraction,
      });
      for (const qq of quizPart.questions) q.push({ ...qq, section: sec.name });
    }
    const quiz: Quiz = {
      id: uid(10),
      title: `${exam.name} • ${pattern.stage} • Offline Mini Mock`,
      examId: exam.id,
      kind: "mock",
      difficulty: 3,
      subjects: [...new Set(q.map((x) => x.subject))],
      topics: [...new Set(q.map((x) => x.topic))],
      questions: q.slice(0, maxQ),
      sections: plan.sections.map((s) => ({ name: s.name, durationMin: s.durationMin, questionIds: q.filter((x) => x.section === s.name).map((x) => x.id) })),
      totalDurationMin: plan.totalDurationMin,
      createdAt: Date.now(),
      source: "sample",
      meta: { stage: pattern.stage },
    };
    await mutateDb((db) => db.quizzes.push(quiz));
    return NextResponse.json({ id: quiz.id, offline: true });
  }

  // ------- AI path: per-section generation on slave lane -------
  if (!orchestrator.hasAnyKey()) {
    return NextResponse.json({ error: "No API key configured. Use offline mock or add a key in Settings." }, { status: 400 });
  }

  const all: Question[] = [];
  const errors: string[] = [];
  for (const sec of plan.sections) {
    try {
      const out = await orchestrator.generateJson<{ questions: { question: string; options: string[]; answerIndex: number; explanation: string; subject: string; topic: string; difficulty: number }[] }>({
        lane: "slave",
        prompt: ctxQuiz(exam, {
          count: sec.questions,
          difficulty: 3,
          kind: "mock",
          section: sec.name,
          sectionHint: sec.name,
        }),
        schema: MCQ_SET_SCHEMA,
        timeoutMs: 180000,
      });
      const perQ = sec.marks / Math.max(1, sec.questions);
      for (const item of (out.questions || []).slice(0, sec.questions)) {
        if (!item?.question) continue;
        all.push({
          id: uid(10),
          type: "mcq-single",
          subject: item.subject || sec.name,
          topic: item.topic || "Mixed",
          difficulty: Math.max(1, Math.min(5, Number(item.difficulty) || 3)),
          marks: Math.round(perQ * 100) / 100,
          negMarks: Math.round(perQ * sec.negFraction * 100) / 100,
          text: item.question,
          options: (item.options || []).slice(0, 4),
          answerIndex: Math.max(0, Math.min(3, Number(item.answerIndex) || 0)),
          explanation: item.explanation || "",
          section: sec.name,
          source: "ai",
        });
      }
    } catch (e) {
      errors.push(`${sec.name}: ${String((e as Error).message || e).slice(0, 120)}`);
    }
  }

  if (!all.length) {
    return NextResponse.json({ error: "All sections failed to generate. " + errors.join(" | ").slice(0, 300) }, { status: 502 });
  }

  const quiz: Quiz = {
    id: uid(10),
    title: `${exam.name} • ${pattern.stage} • Mini Mock`,
    examId: exam.id,
    kind: "mock",
    difficulty: 3,
    subjects: [...new Set(all.map((x) => x.subject))],
    topics: [...new Set(all.map((x) => x.topic))],
    questions: all,
    sections: plan.sections.map((s) => ({ name: s.name, durationMin: s.durationMin, questionIds: all.filter((x) => x.section === s.name).map((x) => x.id) })),
    totalDurationMin: plan.totalDurationMin,
    createdAt: Date.now(),
    source: "ai",
    meta: { stage: pattern.stage, warnings: errors.join(" | ") },
  };
  await mutateDb((db) => db.quizzes.push(quiz));
  return NextResponse.json({ id: quiz.id, sections: plan.sections.length, warnings: errors });
}
