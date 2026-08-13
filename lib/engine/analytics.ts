// ============ Analytics selectors: trends, streaks, readiness, subject radar ============
import type { Attempt, DbData, ExamDef } from "../types";
import { clamp, round2, todayKey } from "../utils";
import { classifyTopic, examReadiness, readiness, topicKey } from "./mastery";

export function attemptsForExam(db: DbData, examId: string): Attempt[] {
  return db.attempts.filter((a) => a.examId === examId && a.status === "submitted" && a.score).sort((a, b) => a.submittedAt! - b.submittedAt!);
}

export interface TrendPoint {
  label: string;
  percent: number;
  accuracy: number;
  ts: number;
}

export function scoreTrend(attempts: Attempt[], maxPoints = 10): TrendPoint[] {
  return attempts.slice(-maxPoints).map((a) => ({
    label: new Date(a.submittedAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    percent: a.score!.percent,
    accuracy: a.score!.accuracy * 100,
    ts: a.submittedAt!,
  }));
}

export function computeStreak(db: DbData): number {
  const days = new Set(db.activity.map((a) => a.date));
  let streak = 0;
  let offset = 0;
  // allow "today not yet active" to not break streak
  if (!days.has(todayKey(0))) offset = 1;
  for (let i = offset; i < 400; i++) {
    const k = todayKey(-i);
    if (days.has(k)) streak++;
    else break;
  }
  return streak;
}

export function activityMap(db: DbData, days = 60): { date: string; count: number; label?: string }[] {
  const counts = new Map<string, { count: number; label?: string }>();
  for (const a of db.activity) {
    const e = counts.get(a.date) || { count: 0 };
    e.count++;
    if (!e.label) e.label = a.label;
    counts.set(a.date, e);
  }
  const out: { date: string; count: number; label?: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = todayKey(-i);
    const e = counts.get(k);
    out.push({ date: k, count: e?.count || 0, label: e?.label });
  }
  return out;
}

export interface SubjectRadarPoint {
  subject: string;
  readiness: number;
  weight: number;
  attempts: number;
}

export function subjectRadar(db: DbData, exam: ExamDef): SubjectRadarPoint[] {
  return exam.syllabus.map((s) => {
    let wsum = 0, sum = 0, n = 0;
    for (const t of s.topics) {
      const stat = db.topicStats[topicKey(exam.id, s.subject, t.name)];
      const r = stat ? readiness(stat, Date.now()) : 0;
      sum += t.weight * r;
      wsum += t.weight;
      n += stat?.n || 0;
    }
    return { subject: s.subject, readiness: wsum > 0 ? round2(sum / wsum) : 0, weight: s.weight, attempts: n };
  });
}

export interface TopicRow {
  subject: string;
  topic: string;
  r: number;
  verdict: string;
  n: number;
  lastSeen: number | null;
  weight: number;
  pyq: number;
  history: number[];
}

export function topicTable(db: DbData, exam: ExamDef): TopicRow[] {
  const rows: TopicRow[] = [];
  for (const s of exam.syllabus) {
    for (const t of s.topics) {
      const stat = db.topicStats[topicKey(exam.id, s.subject, t.name)];
      const { verdict, r } = classifyTopic(stat, Date.now());
      rows.push({
        subject: s.subject,
        topic: t.name,
        r,
        verdict,
        n: stat?.n || 0,
        lastSeen: stat?.lastSeen || null,
        weight: round2(s.weight * t.weight),
        pyq: t.pyq,
        history: stat?.history || [],
      });
    }
  }
  return rows.sort((a, b) => a.r - b.r);
}

export function readinessGauge(db: DbData, exam: ExamDef): { overall: number; attempts: number; quizzes: number; streak: number } {
  return {
    overall: round2(examReadiness(db.topicStats, exam, Date.now()) * 100),
    attempts: attemptsForExam(db, exam.id).length,
    quizzes: db.quizzes.filter((q) => q.examId === exam.id).length,
    streak: computeStreak(db),
  };
}

/** Question-type accuracy across attempts for an exam. */
export function typeAccuracy(db: DbData, examId: string): { type: string; correct: number; attempted: number; accuracy: number }[] {
  const acc = new Map<string, { correct: number; attempted: number }>();
  const quizMap = new Map(db.quizzes.map((q) => [q.id, q]));
  for (const a of db.attempts) {
    if (a.examId !== examId || a.status !== "submitted") continue;
    const quiz = quizMap.get(a.quizId);
    if (!quiz) continue;
    for (const q of quiz.questions) {
      const sel = (a.answers[q.id]?.selected || []).filter(Boolean);
      if (!sel.length) continue;
      const e = acc.get(q.type) || { correct: 0, attempted: 0 };
      e.attempted++;
      // reuse simple correctness check
      const ans = a.answers[q.id];
      const correct =
        q.answerIndex != null && q.options?.length
          ? sel.length === 1 && sel[0] === String(q.answerIndex)
          : q.answerText != null
            ? sel[0] === String(q.answerText).toLowerCase()
            : false;
      if (correct) e.correct++;
      acc.set(q.type, e);
    }
  }
  return [...acc.entries()].map(([type, e]) => ({ type, correct: e.correct, attempted: e.attempted, accuracy: e.attempted ? round2(e.correct / e.attempted) : 0 }));
}

export function guessDamage(db: DbData, examId: string): { guessed: number; correct: number; damage: number } {
  let guessed = 0, correct = 0, damage = 0;
  for (const a of attemptsForExam(db, examId)) {
    if (!a.score) continue;
    guessed += a.score.guessAudit.guessed;
    correct += a.score.guessAudit.guessedCorrect;
    damage += (a.score.guessAudit.guessedWrong || 0) * 0; // real damage lives in obtained
  }
  return { guessed, correct, damage };
}

export function timeEfficiency(db: DbData, examId: string): { avgSec: number; count: number } {
  let total = 0, n = 0;
  for (const a of attemptsForExam(db, examId)) {
    for (const qid of Object.keys(a.answers)) {
      const t = a.answers[qid].timeSpentMs;
      if (t && t > 0) {
        total += t;
        n++;
      }
    }
  }
  return { avgSec: n ? Math.round(total / n / 1000) : 0, count: n };
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1);
}
