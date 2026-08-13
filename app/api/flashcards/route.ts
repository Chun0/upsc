import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";
import { uid } from "@/lib/utils";
import type { Flashcard } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const examId = req.nextUrl.searchParams.get("examId");
  const db = getDb();
  const cards = db.flashcards
    .filter((c) => !examId || c.examId === examId)
    .sort((a, b) => a.dueAt - b.dueAt)
    .map((c) => ({ id: c.id, examId: c.examId, subject: c.subject, topic: c.topic, front: c.front, back: c.back, dueAt: c.dueAt, intervalDays: c.intervalDays, ease: c.ease, lapses: c.lapses }));
  return NextResponse.json({ cards });
}

/** Save AI-generated cards. Body: { examId, subject, cards: [{front, back, topic}] } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.cards?.length) return NextResponse.json({ error: "cards required" }, { status: 400 });
  const now = Date.now();
  const cards: Flashcard[] = body.cards.map((c: { front: string; back: string; topic: string }) => ({
    id: uid(10),
    examId: body.examId || "upsc-cse",
    subject: body.subject || "General",
    topic: c.topic || body.subject || "General",
    front: c.front,
    back: c.back,
    createdAt: now,
    dueAt: now,
    intervalDays: 0,
    ease: 2.5,
    lapses: 0,
    source: "ai",
  }));
  await mutateDb((db) => db.flashcards.push(...cards));
  return NextResponse.json({ count: cards.length });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  await mutateDb((db) => {
    db.flashcards = db.flashcards.filter((c) => c.id !== id);
  });
  return NextResponse.json({ ok: true });
}
