import { NextRequest, NextResponse } from "next/server";
import { orchestrator, NoApiKeyError } from "@/lib/ai/orchestrator";
import { getExam } from "@/lib/content/exams";
import { DIGEST_SCHEMA } from "@/lib/ai/schemas";
import { ctxDigest } from "@/lib/ai/prompts";
import { mutateDb } from "@/lib/store/db";
import { uid } from "@/lib/utils";
import type { SummaryDoc } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Build today's exam-aware current-affairs digest (master + googleSearch) and save as a summary doc. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const examId = body?.examId || "upsc-cse";
  const exam = getExam(examId);
  if (!exam) return NextResponse.json({ error: "unknown exam" }, { status: 400 });
  try {
    const out = await orchestrator.generateJson<{
      headline: string;
      items: { category: string; title: string; summary: string; examRelevance: string; mcqQuestion: string; mcqOptions: string[]; mcqAnswer: string }[];
    }>({
      lane: "master",
      prompt: ctxDigest(exam),
      schema: DIGEST_SCHEMA,
      search: true,
      timeoutMs: 240000,
    });
    const md: string[] = [];
    md.push(`# ${out.headline || "Daily Digest"}`);
    md.push(`> ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • curated for ${exam.name} • verified against live news`);
    for (const it of out.items || []) {
      md.push(`## ${it.category || "News"} — ${it.title}`);
      md.push(it.summary || "");
      md.push(`**Why it matters for ${exam.name}:** ${it.examRelevance || ""}`);
      md.push(`> 📝 **Self-test:** ${it.mcqQuestion}`);
      md.push(`> (${(it.mcqOptions || []).join(" | ")} — answer: ${it.mcqAnswer})`);
      md.push("");
    }
    const doc: SummaryDoc = {
      id: uid(10),
      examId,
      subject: "Current Affairs",
      topic: "Daily Digest",
      title: `Daily Digest — ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
      markdown: md.join("\n"),
      style: "concise",
      createdAt: Date.now(),
      wordCount: md.join(" ").split(/\s+/).length,
      readProgress: 0,
      timesRead: 0,
    };
    await mutateDb((db) => {
      db.summaries.push(doc);
      db.activity.push({ date: new Date().toISOString().slice(0, 10), type: "digest", examId, label: doc.title });
    });
    return NextResponse.json({ id: doc.id, items: (out.items || []).length });
  } catch (e) {
    if (e instanceof NoApiKeyError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: String((e as Error).message || e).slice(0, 300) }, { status: 502 });
  }
}
