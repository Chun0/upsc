import { NextResponse } from "next/server";
import { getDb } from "@/lib/store/db";
import { listExams, getExam } from "@/lib/content/exams";
import { computeStreak, readinessGauge } from "@/lib/engine/analytics";
import { recommendNext } from "@/lib/engine/mastery";
import { todayKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const target = getExam(db.profile?.targetExamId || "upsc-cse") || listExams()[0];
  const now = Date.now();
  const today = todayKey();
  const todayQuestions = db.activity
    .filter((a) => a.date === today && (a.type === "quiz" || a.type === "mock"))
    .reduce((s, a) => s + Number(a.meta?.questions || 0), 0);
  const submitted = db.attempts.filter((a) => a.status === "submitted");
  return NextResponse.json({
    streak: computeStreak(db),
    todayQuestions,
    goal: db.profile?.dailyGoal || 50,
    attempts: submitted.length,
    minutes: Math.round(submitted.reduce((s, a) => s + (a.score?.timeSpentSec || 0), 0) / 60),
    readiness: readinessGauge(db, target).overall,
    weak: recommendNext(db.topicStats, target, now, db.profile?.examDate, 3),
  });
}
