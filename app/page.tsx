import { getDb } from "@/lib/store/db";
import { listExams, getExam } from "@/lib/content/exams";
import { attemptsForExam, activityMap, computeStreak, readinessGauge } from "@/lib/engine/analytics";
import { recommendNext } from "@/lib/engine/mastery";
import { todayKey, fmtDuration, round2 } from "@/lib/utils";
import Hero3D from "@/components/three/Hero3D";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const db = getDb();
  const profile = db.profile;
  const exams = listExams();
  const targetExam = getExam(profile?.targetExamId || "upsc-cse") || exams[0];
  const now = Date.now();

  const submitted = db.attempts.filter((a) => a.status === "submitted");
  const inProgress = db.attempts
    .filter((a) => a.status === "in-progress")
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 3);
  const streak = computeStreak(db);
  const today = todayKey();
  const todayEvents = db.activity.filter((a) => a.date === today);
  const todayQuestions =
    todayEvents
      .filter((a) => a.type === "quiz" || a.type === "mock")
      .reduce((s, a) => s + Number(a.meta?.questions || 0), 0);
  const goal = profile?.dailyGoal || 50;

  const recs = recommendNext(db.topicStats, targetExam, now, profile?.examDate, 3);
  const gauge = readinessGauge(db, targetExam);
  const recent = submitted.slice(-5).reverse();
  const heat = activityMap(db, 60);
  const latestDigest = db.summaries
    .filter((s) => s.title.toLowerCase().includes("digest"))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const totalMinutes = Math.round(submitted.reduce((s, a) => s + (a.score?.timeSpentSec || 0), 0) / 60);

  let examCountdown: { label: string; days: number } | null = null;
  if (profile?.examDate) {
    const days = Math.ceil((new Date(profile.examDate + "T00:00:00").getTime() - now) / 86400000);
    if (days >= 0) examCountdown = { label: targetExam.name, days };
  }

  const quizMap = new Map(db.quizzes.map((q) => [q.id, q]));

  return (
    <div>
      <OnboardingModal />
      <Hero3D />
      <DashboardGrid
        examCountdown={examCountdown}
        streak={streak}
        todayQuestions={todayQuestions}
        goal={goal}
        totalMinutes={totalMinutes}
        attempts={submitted.length}
        readiness={gauge.overall}
        recs={recs.map((r) => ({ subject: r.subject, topic: r.topic, reason: r.reason, verdict: r.verdict }))}
        targetExam={{ id: targetExam.id, name: targetExam.name, icon: targetExam.icon, color: targetExam.color }}
        inProgress={inProgress.map((a) => ({
          id: a.id,
          quizId: a.quizId,
          title: a.title,
          startedAt: a.startedAt,
          answered: Object.keys(a.answers).length,
          total: quizMap.get(a.quizId)?.questions.length || 0,
        }))}
        recent={recent.map((a) => ({
          id: a.id,
          title: a.title,
          submittedAt: a.submittedAt || a.startedAt,
          percent: a.score?.percent || 0,
          max: a.score?.max || 0,
          obtained: a.score?.obtained || 0,
        }))}
        heat={heat}
        latestDigest={latestDigest ? { id: latestDigest.id, title: latestDigest.title, createdAt: latestDigest.createdAt } : null}
        plan={db.studyPlan ? { weeks: db.studyPlan.weeks, examId: db.studyPlan.examId, has: true } : { weeks: 0, examId: "", has: false }}
        hasKey={db.keys.some((k) => k.key && k.status !== "error") || Boolean(process.env.GEMINI_API_KEY)}
      />
    </div>
  );
}
