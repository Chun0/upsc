import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";
import { uid } from "@/lib/utils";
import type { SummaryDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const examId = req.nextUrl.searchParams.get("examId");
  const db = getDb();
  const summaries = db.summaries
    .filter((s) => !examId || s.examId === examId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => ({ id: s.id, examId: s.examId, subject: s.subject, topic: s.topic, title: s.title, style: s.style, createdAt: s.createdAt, wordCount: s.wordCount, readProgress: s.readProgress }));
  return NextResponse.json({ summaries });
}

/** Save a generated markdown summary. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.markdown || !body?.topic) return NextResponse.json({ error: "markdown and topic required" }, { status: 400 });
  const doc: SummaryDoc = {
    id: uid(10),
    examId: body.examId || "upsc-cse",
    subject: body.subject || "General",
    topic: body.topic,
    title: body.title || body.topic,
    markdown: body.markdown,
    style: body.style || "detailed",
    createdAt: Date.now(),
    wordCount: String(body.markdown).split(/\s+/).length,
    readProgress: 0,
    timesRead: 0,
  };
  await mutateDb((db) => db.summaries.push(doc));
  return NextResponse.json({ id: doc.id });
}
