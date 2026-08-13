import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const doc = db.summaries.find((s) => s.id === id);
  if (!doc) return NextResponse.json({ error: "summary not found" }, { status: 404 });
  return NextResponse.json({ doc });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  await mutateDb((db) => {
    const d = db.summaries.find((s) => s.id === id);
    if (d) {
      if (typeof body?.readProgress === "number") d.readProgress = Math.max(0, Math.min(1, body.readProgress));
      if (body?.completed) {
        d.timesRead += 1;
        d.lastReadAt = Date.now();
        d.readProgress = 1;
        db.activity.push({ date: new Date().toISOString().slice(0, 10), type: "study", examId: d.examId, label: d.topic });
      }
    }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await mutateDb((db) => {
    db.summaries = db.summaries.filter((s) => s.id !== id);
  });
  return NextResponse.json({ ok: true });
}
