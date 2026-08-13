import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/store/db";

export const dynamic = "force-dynamic";

/** Full analytics payload for a given exam (client-side selectors). API keys are masked — never leaked to the client. */
export async function GET(req: NextRequest) {
  const examId = req.nextUrl.searchParams.get("examId") || "upsc-cse";
  const db = getDb();
  const { keys, ...rest } = db;
  return NextResponse.json({
    ...rest,
    examId,
    keys: keys.map((k) => ({ id: k.id, label: k.label, masked: k.masked, status: k.status })),
  });
}
