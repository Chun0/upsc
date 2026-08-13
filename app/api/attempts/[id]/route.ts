import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const attempt = db.attempts.find((a) => a.id === id);
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  const quiz = db.quizzes.find((q) => q.id === attempt.quizId);
  if (!quiz) return NextResponse.json({ error: "quiz missing" }, { status: 404 });
  // While in-progress, hide the answer key from the client (anti-peek).
  const safeQuiz = attempt.status === "in-progress"
    ? { ...quiz, questions: quiz.questions.map(({ answerIndex, answerText, explanation, ...q }) => q) }
    : quiz;
  return NextResponse.json({ attempt, quiz: safeQuiz });
}

/** Save answer progress while in-progress. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.answers) return NextResponse.json({ error: "answers required" }, { status: 400 });
  await mutateDb((db) => {
    const a = db.attempts.find((x) => x.id === id);
    if (a && a.status === "in-progress") {
      const prev = a.answers;
      const merged: typeof prev = {};
      // keep richer stored state (timings) and overlay latest client state
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
      a.answers = { ...prev, ...merged };
    }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await mutateDb((db) => {
    db.attempts = db.attempts.filter((a) => a.id !== id);
  });
  return NextResponse.json({ ok: true });
}
