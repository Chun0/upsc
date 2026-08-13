import { NextRequest, NextResponse } from "next/server";
import { getDb, addKey, removeKey, setKeyStatus, mutateDb } from "@/lib/store/db";
import { maskKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    keys: db.keys.map((k) => ({ id: k.id, label: k.label, masked: k.masked, status: k.status, lastError: k.lastError, addedAt: k.addedAt })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const rec = await addKey(body.label || "", body.key);
  return NextResponse.json({ ok: true, key: { id: rec.id, label: rec.label, masked: rec.masked, status: rec.status } });
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await removeKey(id);
  return NextResponse.json({ ok: true });
}
