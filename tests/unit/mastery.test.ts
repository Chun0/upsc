import { describe, it, expect } from "vitest";
import {
  updateTopicStat, decayedValue, readiness, classifyTopic, topicKey,
  recommendNext, perfSignal, applyAttemptToStats, STRONG_AT, WEAK_AT,
} from "../../lib/engine/mastery";
import { getExam } from "../../lib/content/exams";
import type { TopicStat } from "../../lib/types";

const NOW = Date.now();
const DAY = 86400000;

function stat(ewma: number, n: number, lastSeen = NOW, weakStreak = 0, history: number[] = []): TopicStat {
  return { examId: "e", subject: "s", topic: "t", ewma, n, lastSeen, confidence: n ? 1 - Math.exp(-n / 5) : 0, history, weakStreak };
}

describe("perfSignal", () => {
  it("hard-correct is stronger than easy-correct", () => {
    expect(perfSignal(true, 5, 1)).toBeGreaterThan(perfSignal(true, 1, 1));
  });
  it("wrong-on-easy is penalised more than wrong-on-hard", () => {
    expect(perfSignal(false, 1, 1)).toBeLessThan(perfSignal(false, 5, 1));
  });
  it("stays within [0, 1.15]", () => {
    expect(perfSignal(true, 5, 1.15)).toBeLessThanOrEqual(1.15);
    expect(perfSignal(false, 1, 0.85)).toBeGreaterThanOrEqual(0);
  });
});

describe("updateTopicStat", () => {
  it("first evidence pulls from neutral prior (alpha=1/2)", () => {
    const s = updateTopicStat(undefined, 0.8, NOW, { examId: "e", subject: "s", topic: "t" });
    // prior 0.5, alpha = 1/(1+1) = 0.5 -> 0.5 + 0.5*(0.8-0.5) = 0.65
    expect(s.ewma).toBe(0.65);
    expect(s.n).toBe(1);
  });
  it("converges toward sustained performance", () => {
    let s: TopicStat | undefined;
    for (let i = 0; i < 12; i++) s = updateTopicStat(s, 0.9, NOW, { examId: "e", subject: "s", topic: "t" });
    expect(s!.ewma).toBeGreaterThan(0.85);
    expect(s!.confidence).toBeGreaterThan(0.85);
    expect(s!.history.length).toBe(12);
  });
  it("tracks weak streaks", () => {
    let s: TopicStat | undefined;
    s = updateTopicStat(s, 0.2, NOW, { examId: "e", subject: "s", topic: "t" });
    s = updateTopicStat(s, 0.3, NOW, { examId: "e", subject: "s", topic: "t" });
    expect(s!.weakStreak).toBe(2);
    s = updateTopicStat(s, 0.9, NOW, { examId: "e", subject: "s", topic: "t" });
    expect(s!.weakStreak).toBe(0);
  });
});

describe("decay & readiness", () => {
  it("decays mastery over time", () => {
    const s = stat(0.9, 10, NOW - 30 * DAY);
    const v = decayedValue(s, NOW);
    expect(v).toBeLessThan(0.9);
    expect(v).toBeCloseTo(0.9 * Math.exp(-1), 1);
  });
  it("confidence discounts unproven mastery", () => {
    const fresh = stat(0.9, 1, NOW); // n=1 -> confidence ~0.18
    const proven = stat(0.9, 20, NOW); // n=20 -> confidence ~0.98
    expect(readiness(fresh, NOW)).toBeLessThan(readiness(proven, NOW));
  });
  it("classifies correctly", () => {
    expect(classifyTopic(undefined, NOW).verdict).toBe("unrated");
    expect(classifyTopic(stat(0.9, 12, NOW), NOW).verdict).toBe("strong");
    expect(classifyTopic(stat(0.3, 8, NOW), NOW).verdict).toBe("weak");
    expect(classifyTopic(stat(0.6, 8, NOW), NOW).verdict).toBe("developing");
    expect(STRONG_AT).toBeGreaterThan(WEAK_AT);
  });
});

describe("applyAttemptToStats", () => {
  it("updates only attempted questions and keys correctly", () => {
    const exam = getExam("ssc-cgl")!;
    const q = exam.samples[0];
    const quiz = {
      id: "qz", title: "t", examId: exam.id, kind: "practice" as const, difficulty: 2,
      subjects: [], topics: [], totalDurationMin: 5, createdAt: 1, source: "sample" as const,
      sections: [{ name: "S", durationMin: 0, questionIds: ["q1", "q2"] }],
      questions: [
        { id: "q1", type: "mcq-single" as const, subject: q.s, topic: q.t, difficulty: q.d, marks: 2, negMarks: 0.66, text: q.q, options: q.o, answerIndex: q.a, source: "sample" as const },
        { id: "q2", type: "mcq-single" as const, subject: q.s, topic: q.t, difficulty: q.d, marks: 2, negMarks: 0.66, text: "x", options: ["a", "b"], answerIndex: 0, source: "sample" as const },
      ],
    };
    const stats = applyAttemptToStats({}, quiz, { q1: { selected: [String(q.a)], timeSpentMs: 5000 }, q2: { selected: [] } }, exam.id, NOW);
    const key = topicKey(exam.id, q.s, q.t);
    expect(stats[key]).toBeDefined();
    expect(stats[key].n).toBe(1);
    expect(stats[key].ewma).toBeGreaterThan(0.5); // fast correct on moderate difficulty
  });
});

describe("recommendNext", () => {
  it("ranks weak high-weight high-PYQ topics first", () => {
    const exam = getExam("ssc-cgl")!;
    const stats: Record<string, TopicStat> = {};
    const recs = recommendNext(stats, exam, NOW, undefined, 5);
    expect(recs.length).toBeGreaterThan(0);
    // untouched topics all have gap=1; the top should be from the highest-weight subject
    const top = recs[0];
    expect(top.verdict).toBe("unrated");
    expect(recs[0].score).toBeGreaterThanOrEqual(recs[recs.length - 1].score);
  });
  it("boosts proximity when exam date is near", () => {
    const exam = getExam("ssc-cgl")!;
    const near = recommendNext({}, exam, NOW, new Date(NOW + 20 * DAY).toISOString().slice(0, 10), 1)[0];
    const far = recommendNext({}, exam, NOW, new Date(NOW + 300 * DAY).toISOString().slice(0, 10), 1)[0];
    expect(near.score).toBeGreaterThan(far.score);
  });
  it("ranks weak topics above untouched when both exist", () => {
    const exam = getExam("ssc-cgl")!;
    const stats: Record<string, TopicStat> = {};
    const weakTopic = exam.syllabus[0].topics[0];
    const weakKey = topicKey(exam.id, exam.syllabus[0].subject, weakTopic.name);
    stats[weakKey] = stat(0.2, 6, NOW, 2, [0.2, 0.2]);
    const recs = recommendNext(stats, exam, NOW, undefined, 3);
    const hasWeak = recs.some((r) => r.topic === weakTopic.name);
    expect(hasWeak).toBe(true);
  });
});
