import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const now = Date.now();
  const due = db.flashcards.filter((c) => c.dueAt <= now).length;
  return NextResponse.json({ due, total: db.flashcards.length });
}

/** SM-2-lite review update. Body: { cardId, rating: 'again'|'good'|'easy' } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.cardId || !body?.rating) return NextResponse.json({ error: "cardId and rating required" }, { status: 400 });
  const now = Date.now();
  const DAY = 86400000;
  await mutateDb((db) => {
    const c = db.flashcards.find((x) => x.id === body.cardId);
    if (!c) return;
    if (body.rating === "again") {
      c.lapses += 1;
      c.ease = Math.max(1.3, c.ease - 0.2);
      c.intervalDays = 0;
      c.dueAt = now + 10 * 60000; // 10 min
    } else if (body.rating === "good") {
      c.intervalDays = c.intervalDays === 0 ? 1 : Math.round(c.intervalDays * c.ease);
      c.dueAt = now + c.intervalDays * DAY;
    } else {
      c.intervalDays = c.intervalDays === 0 ? 4 : Math.round(c.intervalDays * c.ease * 1.3);
      c.ease = Math.min(3.0, c.ease + 0.05);
      c.dueAt = now + c.intervalDays * DAY;
    }
    db.activity.push({ date: new Date().toISOString().slice(0, 10), type: "revision", examId: c.examId, label: c.topic });
  });
  return NextResponse.json({ ok: true });
}
