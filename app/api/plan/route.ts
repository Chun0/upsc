import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";
import { getExam } from "@/lib/content/exams";
import { templatePlan } from "@/lib/engine/plan";
import { orchestrator, NoApiKeyError } from "@/lib/ai/orchestrator";
import { PLAN_SCHEMA } from "@/lib/ai/schemas";
import { ctxPlan } from "@/lib/ai/prompts";
import { recommendNext } from "@/lib/engine/mastery";
import type { StudyPlan } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const db = getDb();
  return NextResponse.json({ plan: db.studyPlan });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const examId = body?.examId || getDb().profile?.targetExamId || "upsc-cse";
  const exam = getExam(examId);
  if (!exam) return NextResponse.json({ error: "unknown exam" }, { status: 400 });
  const db = getDb();

  let plan: StudyPlan | null = null;
  if (orchestrator.hasAnyKey()) {
    try {
      const weak = recommendNext(db.topicStats, exam, Date.now(), db.profile?.examDate, 10).map((r) => `${r.subject}: ${r.topic}`);
      const out = await orchestrator.generateJson<StudyPlan>({
        lane: "master",
        prompt: ctxPlan(exam, { weeks: Number(body?.weeks) || exam.plan.weeks, hoursPerDay: Number(body?.hoursPerDay) || exam.plan.hoursPerDay, weakTopics: weak }),
        schema: PLAN_SCHEMA,
      });
      plan = { examId, weeks: out.weeks, hoursPerDay: out.hoursPerDay, createdAt: Date.now(), phases: out.phases, weekly: out.weekly };
    } catch (e) {
      if (!(e instanceof NoApiKeyError)) console.error("[plan]", String(e));
    }
  }
  if (!plan) plan = templatePlan(exam, body?.weeks, body?.hoursPerDay);

  await mutateDb((d) => {
    d.studyPlan = plan;
  });
  return NextResponse.json({ plan, aiGenerated: Boolean(orchestrator.hasAnyKey()) });
}
