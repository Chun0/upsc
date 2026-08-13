// ============ Mastery algorithm: adaptive EWMA + forgetting decay + confidence + recommendations ============
import type { ExamDef, Quiz, TopicStat } from "../types";
import { clamp, daysBetween, round2 } from "../utils";
import { isCorrect, normalizedSelection, qMarks } from "./quiz";

export const DECAY_TAU_DAYS = 30; // e-folding time of forgetting decay
export const STRONG_AT = 0.72;
export const WEAK_AT = 0.45;
export const MIN_CONFIDENCE = 0.55;

export function topicKey(examId: string, subject: string, topic: string): string {
  return `${examId}::${subject}::${topic}`;
}

/** Per-question weighted performance signal in [0,1]. Difficulty & time adjust the signal. */
export function perfSignal(correct: boolean, difficulty: number, timeFactor: number): number {
  const d = clamp(difficulty, 1, 5);
  const tf = clamp(timeFactor, 0.85, 1.15);
  if (correct) return clamp(1 * (0.8 + 0.05 * d) * tf, 0, 1.15); // hard-correct is stronger evidence
  // wrong answers: easy questions penalise harder (0.162 at d=1) than hard ones (0.198 at d=5)
  return clamp(0.18 * (0.85 + 0.05 * d) * tf, 0, 0.3);
}

/** Ideal time per question in ms, scaled by difficulty (25s base + 15s/difficulty). */
export function idealTimeMs(difficulty: number, kind?: string): number {
  if (kind === "descriptive") return 180000;
  return (25000 + clamp(difficulty, 1, 5) * 15000);
}

export function updateTopicStat(
  stat: TopicStat | undefined,
  perf: number,
  now: number,
  meta: { examId: string; subject: string; topic: string }
): TopicStat {
  const base: TopicStat = stat || {
    examId: meta.examId,
    subject: meta.subject,
    topic: meta.topic,
    ewma: 0.5,
    n: 0,
    lastSeen: now,
    confidence: 0,
    history: [],
    weakStreak: 0,
  };
  const n = base.n + 1;
  const alpha = 1 / (1 + n); // adaptive learning rate: early evidence moves fast, later evidence refines
  const ewma = round2(base.ewma + alpha * (clamp(perf, 0, 1.15) - base.ewma));
  const history = [...base.history, round2(perf)].slice(-12);
  const confidence = round2(1 - Math.exp(-n / 5));
  const weakStreak = perf < WEAK_AT ? base.weakStreak + 1 : 0;
  return { ...base, ewma, n, lastSeen: now, confidence, history, weakStreak };
}

/** Apply forgetting decay (Ebbinghaus-style) without mutating stored state. */
export function decayedValue(stat: TopicStat, now: number, tauDays = DECAY_TAU_DAYS): number {
  const days = Math.max(0, daysBetween(stat.lastSeen, now));
  return round2(stat.ewma * Math.exp(-days / tauDays));
}

/** Readiness = decayed mastery blended with confidence (unproven mastery is discounted). */
export function readiness(stat: TopicStat, now: number): number {
  const m = decayedValue(stat, now);
  return round2(m * (0.65 + 0.35 * stat.confidence));
}

export type TopicVerdict = "strong" | "developing" | "weak" | "unrated";

export function classifyTopic(stat: TopicStat | undefined, now: number): { verdict: TopicVerdict; r: number } {
  if (!stat || stat.n === 0) return { verdict: "unrated", r: 0 };
  const r = readiness(stat, now);
  if (r >= STRONG_AT && stat.confidence >= MIN_CONFIDENCE) return { verdict: "strong", r };
  if (r < WEAK_AT) return { verdict: "weak", r };
  return { verdict: "developing", r };
}

/** Update all topic stats from a submitted attempt. Returns updated stats map (mutates db map). */
export function applyAttemptToStats(
  stats: Record<string, TopicStat>,
  quiz: Quiz,
  answers: Record<string, { selected?: string[]; timeSpentMs?: number }>,
  examId: string,
  now: number
): Record<string, TopicStat> {
  for (const q of quiz.questions) {
    if (q.type === "descriptive") continue;
    const a = answers[q.id];
    const sel = (a?.selected || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean);
    if (!sel.length) continue; // unattempted gives no mastery signal
    const correct = isCorrect(q, a as never);
    const ideal = idealTimeMs(q.difficulty);
    const spent = a?.timeSpentMs || ideal;
    const timeFactor = correct ? (spent <= ideal ? 1.12 : 1.0) : 0.95; // fast-correct boosts, slow-correct neutral
    const perf = perfSignal(correct, q.difficulty, timeFactor);
    const key = topicKey(examId, q.subject, q.topic);
    stats[key] = updateTopicStat(stats[key], perf, now, { examId, subject: q.subject, topic: q.topic });
  }
  return stats;
}

export interface Recommendation {
  subject: string;
  topic: string;
  score: number;
  reason: string;
  verdict: TopicVerdict;
}

/** Rank what to study next: gap × syllabus weight × exam proximity × weak streak. */
export function recommendNext(
  stats: Record<string, TopicStat>,
  exam: ExamDef,
  now: number,
  examDate?: string,
  limit = 5
): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const subject of exam.syllabus) {
    for (const topic of subject.topics) {
      const key = topicKey(exam.id, subject.subject, topic.name);
      const stat = stats[key];
      const { verdict, r } = classifyTopic(stat, now);
      let gap = 1 - (stat ? r : 0);
      if (verdict === "unrated") gap = 1; // unknown = full gap
      let proximityBoost = 1;
      if (examDate) {
        const daysToExam = daysBetween(now, new Date(examDate + "T00:00:00").getTime());
        if (daysToExam >= 0 && daysToExam < 120) proximityBoost = clamp(2.2 - daysToExam / 60, 1, 2.2);
      }
      const weightFactor = 0.5 + 0.5 * clamp(topic.weight, 0, 1);
      const streakBoost = 1 + Math.min(1, (stat?.weakStreak || 0) * 0.25);
      const score = round2(gap * weightFactor * proximityBoost * streakBoost * (0.6 + 0.4 * (topic.pyq / 5)));
      const reason =
        verdict === "unrated"
          ? `Never attempted — high-weight topic (PYQ ${topic.pyq}/5)`
          : verdict === "weak"
            ? `Readiness ${Math.round(r * 100)}%${stat && stat.weakStreak > 1 ? ` — ${stat.weakStreak} weak attempts in a row` : ""}`
            : `Developing (${Math.round(r * 100)}%) — push past ${Math.round(STRONG_AT * 100)}%`;
      recs.push({ subject: subject.subject, topic: topic.name, score, reason, verdict });
    }
  }
  return recs.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Weighted exam readiness across all syllabus topics. */
export function examReadiness(stats: Record<string, TopicStat>, exam: ExamDef, now: number): number {
  let wsum = 0, sum = 0;
  for (const subject of exam.syllabus) {
    for (const topic of subject.topics) {
      const w = subject.weight * topic.weight;
      const key = topicKey(exam.id, subject.subject, topic.name);
      const stat = stats[key];
      const r = stat ? readiness(stat, now) : 0;
      sum += w * r;
      wsum += w;
    }
  }
  return wsum > 0 ? round2(sum / wsum) : 0;
}

/** Strong topics list for reports. */
export function strongTopics(stats: Record<string, TopicStat>, exam: ExamDef, now: number, limit = 5) {
  const out: { subject: string; topic: string; r: number; n: number }[] = [];
  for (const subject of exam.syllabus) {
    for (const topic of subject.topics) {
      const stat = stats[topicKey(exam.id, subject.subject, topic.name)];
      const { verdict, r } = classifyTopic(stat, now);
      if (verdict === "strong") out.push({ subject: subject.subject, topic: topic.name, r, n: stat!.n });
    }
  }
  return out.sort((a, b) => b.r - a.r).slice(0, limit);
}
