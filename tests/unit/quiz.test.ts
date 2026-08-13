import { describe, it, expect } from "vitest";
import { scoreQuiz, isCorrect, breakEvenAccuracy, miniMockPlan, buildOfflineQuiz, normalizedSelection } from "../../lib/engine/quiz";
import { getExam } from "../../lib/content/exams";
import type { Quiz } from "../../lib/types";

function mcq(id: string, answerIndex: number, opts: Partial<Quiz["questions"][number]> = {}): Quiz["questions"][number] {
  return {
    id, type: "mcq-single", subject: "Maths", topic: "Percentages", difficulty: 2,
    marks: 2, negMarks: 0.66, text: `Q ${id}`, options: ["A", "B", "C", "D"], answerIndex,
    explanation: "ex", ...opts,
  };
}

const quiz: Quiz = {
  id: "q", title: "t", examId: "ssc-cgl", kind: "practice", difficulty: 2,
  subjects: ["Maths"], topics: ["Percentages"], totalDurationMin: 10, createdAt: 1, source: "ai",
  questions: [
    mcq("q1", 0, { section: "Sec A" }),
    mcq("q2", 1, { topic: "Algebra", section: "Sec A" }),
    mcq("q3", 2, { subject: "Reasoning", topic: "Series", section: "Sec A" }),
    mcq("q4", 3, { type: "mcq-multi", answerIndex: undefined, answerText: "1,2", section: "Sec B" }),
    mcq("q5", 0, { type: "fill", answerIndex: undefined, answerText: "Delhi", section: "Sec B" }),
    mcq("q6", 0, { type: "truefalse", options: ["True", "False"], answerIndex: 0, section: "Sec B" }),
  ],
  sections: [
    { name: "Sec A", durationMin: 5, questionIds: ["q1", "q2", "q3"] },
    { name: "Sec B", durationMin: 5, questionIds: ["q4", "q5", "q6"] },
  ],
};

describe("isCorrect", () => {
  it("mcq-single", () => {
    expect(isCorrect(quiz.questions[0], { selected: ["0"] })).toBe(true);
    expect(isCorrect(quiz.questions[0], { selected: ["1"] })).toBe(false);
    expect(isCorrect(quiz.questions[0], { selected: [] })).toBe(false);
  });
  it("mcq-multi all-or-nothing", () => {
    expect(isCorrect(quiz.questions[3], { selected: ["1", "2"] })).toBe(true);
    expect(isCorrect(quiz.questions[3], { selected: ["1"] })).toBe(false);
  });
  it("fill case/space-insensitive", () => {
    expect(isCorrect(quiz.questions[4], { selected: ["  delhi "] })).toBe(true);
    expect(isCorrect(quiz.questions[4], { selected: ["mumbai"] })).toBe(false);
  });
  it("truefalse", () => {
    expect(isCorrect(quiz.questions[5], { selected: ["0"] })).toBe(true);
  });
});

describe("scoreQuiz", () => {
  it("scores correct/wrong/negative/unattempted", () => {
    const score = scoreQuiz(quiz, {
      q1: { selected: ["0"], timeSpentMs: 30000 },
      q2: { selected: ["0"], timeSpentMs: 20000 }, // wrong
      q3: { selected: [] },
      q4: { selected: ["1", "2"], timeSpentMs: 40000 }, // correct multi
      q5: { selected: ["delhi"], timeSpentMs: 15000 },
      q6: { selected: [] },
    }, Date.now() - 200000);
    expect(score.max).toBe(12);
    expect(score.attempted).toBe(4);
    expect(score.correct).toBe(3);
    expect(score.wrong).toBe(1);
    expect(score.unattempted).toBe(2);
    expect(score.obtained).toBeCloseTo(3 * 2 - 0.66, 2);
    expect(score.accuracy).toBeCloseTo(3 / 4, 3);
    expect(score.perSection.length).toBe(2);
    expect(score.perTopic.length).toBe(3);
  });

  it("guess audit flags fast answers", () => {
    const score = scoreQuiz(quiz, {
      q1: { selected: ["0"], timeSpentMs: 3000 }, // fast correct -> guessedCorrect
      q2: { selected: ["0"], timeSpentMs: 2500 }, // fast wrong (correct is 1) -> guessedWrong
      q3: { selected: [] }, q4: { selected: [] }, q5: { selected: [] }, q6: { selected: [] },
    }, Date.now() - 60000);
    expect(score.guessAudit.guessed).toBe(2);
    expect(score.guessAudit.guessedCorrect).toBe(1);
    expect(score.guessAudit.guessedWrong).toBe(1);
  });

  it("negative penalty capped per question and overall score floored at 0", () => {
    const q: Quiz = { ...quiz, questions: [mcq("x", 0, { marks: 1, negMarks: 5 })] };
    const score = scoreQuiz(q, { x: { selected: ["1"], timeSpentMs: 9000 } }, Date.now() - 30000);
    // per-question penalty min(neg, marks) = 1; overall floor = 0 (mirrors real exam scoring)
    expect(score.obtained).toBe(0);
  });

  it("no negative marking exam scores 0 floor", () => {
    const q: Quiz = { ...quiz, questions: [mcq("x", 0, { marks: 1, negMarks: 0 })] };
    const score = scoreQuiz(q, { x: { selected: ["1"], timeSpentMs: 9000 } }, Date.now() - 30000);
    expect(score.obtained).toBe(0);
  });
});

describe("breakEvenAccuracy", () => {
  it("1/3 negative -> 25% break-even", () => {
    expect(breakEvenAccuracy(1 / 3)).toBeCloseTo(0.25, 2);
  });
  it("no negative -> 0%", () => {
    expect(breakEvenAccuracy(0)).toBe(0);
  });
});

describe("miniMockPlan", () => {
  it("scales sections proportionally for SSC CGL", () => {
    const exam = getExam("ssc-cgl")!;
    const plan = miniMockPlan(exam, "Tier I", 20);
    const totalQ = plan.sections.reduce((a, s) => a + s.questions, 0);
    expect(totalQ).toBeGreaterThanOrEqual(18);
    expect(totalQ).toBeLessThanOrEqual(22);
    expect(plan.sections.every((s) => s.negFraction === 0.25)).toBe(true);
    expect(plan.totalDurationMin).toBeGreaterThan(0);
  });
  it("handles UPSC CSAT (qualifying paper) too", () => {
    const exam = getExam("upsc-cse")!;
    const plan = miniMockPlan(exam, "Prelims CSAT (Paper II)", 15);
    expect(plan.sections[0].name).toContain("CSAT");
  });
});

describe("buildOfflineQuiz", () => {
  it("builds from samples with correct structure", () => {
    const exam = getExam("nda")!;
    const q = buildOfflineQuiz(exam, { count: 5, marksPerQ: 2.5, negFraction: 1 / 3, kind: "practice" });
    expect(q.questions.length).toBe(5);
    for (const qq of q.questions) {
      expect(qq.options?.length).toBe(4);
      expect(qq.answerIndex).toBeGreaterThanOrEqual(0);
      expect(qq.answerIndex).toBeLessThan(4);
      expect(qq.negMarks).toBeCloseTo(2.5 / 3, 1);
      expect(qq.source).toBe("sample");
    }
  });
  it("filters by subject", () => {
    const exam = getExam("upsc-cse")!;
    const q = buildOfflineQuiz(exam, { subject: "Economy", count: 3 });
    expect(q.questions.every((x) => x.subject === "Economy")).toBe(true);
  });
  it("never exceeds available pool", () => {
    const exam = getExam("ctet")!;
    const q = buildOfflineQuiz(exam, { count: 30 });
    expect(q.questions.length).toBeLessThanOrEqual(exam.samples.length);
  });
});

describe("normalizedSelection", () => {
  it("normalizes strings", () => {
    expect(normalizedSelection({ selected: ["  A ", ""] })).toEqual(["a"]);
  });
});
