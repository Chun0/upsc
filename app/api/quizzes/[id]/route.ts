import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const quiz = db.quizzes.find((q) => q.id === id);
  if (!quiz) return NextResponse.json({ error: "quiz not found" }, { status: 404 });
  return NextResponse.json({ quiz });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await mutateDb((db) => {
    db.quizzes = db.quizzes.filter((q) => q.id !== id);
  });
  return NextResponse.json({ ok: true });
}
