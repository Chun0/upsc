import { NextResponse } from "next/server";
import { orchestrator } from "@/lib/ai/orchestrator";
import { NoApiKeyError } from "@/lib/ai/orchestrator";
import { mutateDb, getDb } from "@/lib/store/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** List models available on the first healthy key — for the settings dropdown enrichment. */
export async function GET() {
  try {
    const models = await orchestrator.listModels();
    return NextResponse.json({ models });
  } catch (e) {
    if (e instanceof NoApiKeyError) return NextResponse.json({ error: e.message, models: [] }, { status: 400 });
    return NextResponse.json({ error: String((e as Error).message || e), models: [] }, { status: 502 });
  }
}

/** Verify a specific key (add + test). Body: {label, key}. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const { addKey } = await import("@/lib/store/db");
  const rec = await addKey(body.label || "", body.key);
  try {
    const models = await orchestrator.listModels();
    await mutateDb((db) => {
      const k = db.keys.find((x) => x.id === rec.id);
      if (k) k.status = "ok";
    });
    return NextResponse.json({ ok: true, id: rec.id, modelCount: models.length });
  } catch (e) {
    await mutateDb((db) => {
      const k = db.keys.find((x) => x.id === rec.id);
      if (k) {
        k.status = "error";
        k.lastError = String((e as Error).message || e).slice(0, 180);
      }
    });
    return NextResponse.json({ ok: false, id: rec.id, error: String((e as Error).message || e).slice(0, 220) }, { status: 400 });
  }
}
