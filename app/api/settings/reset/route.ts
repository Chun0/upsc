import { NextResponse } from "next/server";
import { dataDir, dbPath, reloadDb } from "@/lib/store/db";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST() {
  // nuke runtime db (keeps nothing — full factory reset) and drop the in-memory cache
  try {
    fs.rmSync(dbPath(), { force: true });
    const dir = dataDir();
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {
    /* ignore */
  }
  reloadDb();
  return NextResponse.json({ ok: true });
}
