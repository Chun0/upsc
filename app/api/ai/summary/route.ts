import { NextRequest } from "next/server";
import { orchestrator, NoApiKeyError } from "@/lib/ai/orchestrator";
import { getExam } from "@/lib/content/exams";
import { OUTLINE_SCHEMA } from "@/lib/ai/schemas";
import { ctxOutline, ctxSummaryProse } from "@/lib/ai/prompts";
import { getDb } from "@/lib/store/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Streaming summary generation (multi-agent):
 *  1. SLAVE drafts a structured outline (cheap, fast)
 *  2. MASTER streams the full markdown prose section by section
 * Body: { examId, subject, topic, style }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.examId || !body?.topic) return Response.json({ error: "examId and topic required" }, { status: 400 });
  const exam = getExam(body.examId);
  if (!exam) return Response.json({ error: "unknown exam" }, { status: 400 });
  const style: string = body.style || "detailed";

  let outline: { title: string; sections: { heading: string; keyPoints: string[] }[] };
  try {
    outline = await orchestrator.generateJson({
      lane: "slave",
      prompt: ctxOutline(exam, body.subject || "General", body.topic, style),
      schema: OUTLINE_SCHEMA,
      search: false,
      timeoutMs: 120000,
    });
  } catch (e) {
    if (e instanceof NoApiKeyError) return Response.json({ error: e.message }, { status: 400 });
    return Response.json({ error: String((e as Error).message || e).slice(0, 300) }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* client gone */
        }
      };
      send(JSON.stringify({ title: outline.title || body.topic }) + "\n");
      try {
        const prompt = ctxSummaryProse(exam, body.subject || "General", body.topic, style, JSON.stringify(outline));
        await orchestrator.generate({
          lane: "master",
          prompt,
          stream: true,
          search: false,
          timeoutMs: 240000,
          maxOutputTokens: 8192,
          onChunk: (t) => send(t),
        });
      } catch (e) {
        const msg = String((e as Error).message || e).slice(0, 200);
        send(`\n\n> ⚠️ Generation error: ${msg}`);
      }
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
