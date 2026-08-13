import { NextRequest, NextResponse } from "next/server";
import { getDb, getProfile, getSettings, mutateDb } from "@/lib/store/db";
import type { Profile, Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    profile: db.profile,
    settings: db.settings,
    keyCount: db.keys.length,
    hasAnyKey: db.keys.some((k) => k.key && k.status !== "error") || Boolean(process.env.GEMINI_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  if (body.profile) {
    const p = body.profile as Profile;
    await mutateDb((db) => {
      db.profile = { ...(db.profile || getProfile()), ...p };
    });
  }
  if (body.settings) {
    const s = body.settings as Partial<Settings>;
    await mutateDb((db) => {
      const cur = getSettings();
      db.settings = { ...cur, ...s };
    });
  }
  return NextResponse.json({ ok: true });
}
