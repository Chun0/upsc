import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";
import { getExam } from "@/lib/content/exams";
import { uid } from "@/lib/utils";
import type { Attempt } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const attempts = db.attempts
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((a) => ({
      id: a.id,
      quizId: a.quizId,
      examId: a.examId,
      title: a.title,
      kind: a.kind,
      status: a.status,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      percent: a.score?.percent,
      obtained: a.score?.obtained,
      max: a.score?.max,
      aiAnalysis: a.aiAnalysis,
    }));
  return NextResponse.json({ attempts });
}

/** Start an attempt on a saved quiz (practice / mock). Body: { quizId, examId } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });
  const db = getDb();
  const quiz = db.quizzes.find((q) => q.id === body.quizId);
  if (!quiz) return NextResponse.json({ error: "quiz not found" }, { status: 404 });

  // resume in-progress attempt if exists
  const existing = db.attempts.find((a) => a.quizId === quiz.id && a.status === "in-progress");
  if (existing) return NextResponse.json({ id: existing.id, resumed: true });

  const exam = getExam(quiz.examId);
  const attempt: Attempt = {
    id: uid(10),
    quizId: quiz.id,
    examId: quiz.examId,
    title: quiz.title,
    kind: quiz.kind,
    status: "in-progress",
    startedAt: Date.now(),
    answers: {},
  };
  await mutateDb((d) => {
    d.attempts.push(attempt);
    d.activity.push({
      date: new Date().toISOString().slice(0, 10),
      type: quiz.kind === "mock" ? "mock" : "quiz",
      examId: quiz.examId,
      label: quiz.title,
    });
  });
  void exam;
  return NextResponse.json({ id: attempt.id, resumed: false });
}
