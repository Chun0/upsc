import { describe, it, expect } from "vitest";
import { buildReportMarkdown, fallbackReportData } from "../../lib/report/template";
import { getExam } from "../../lib/content/exams";
import type { Attempt, Quiz, ScoreSummary } from "../../lib/types";

function makeScore(): ScoreSummary {
  return {
    obtained: 7.34, max: 12, attempted: 5, correct: 4, wrong: 1, unattempted: 1,
    accuracy: 0.8, percent: 61.2,
    guessAudit: { guessed: 2, guessedCorrect: 0, guessedWrong: 2 },
    perSection: [
      { name: "Quant", questions: 3, attempted: 3, correct: 3, wrong: 0, unattempted: 0, obtained: 6, max: 6, accuracy: 1 },
      { name: "Reasoning", questions: 3, attempted: 2, correct: 1, wrong: 1, unattempted: 1, obtained: 1.34, max: 6, accuracy: 0.5 },
    ],
    perTopic: [
      { subject: "M", topic: "Percentages", attempted: 3, correct: 3, wrong: 0, unattempted: 0, obtained: 6, max: 6 },
      { subject: "R", topic: "Series", attempted: 2, correct: 1, wrong: 1, unattempted: 0, obtained: 1.34, max: 4 },
      { subject: "R", topic: "Coding", attempted: 0, correct: 0, wrong: 0, unattempted: 1, obtained: 0, max: 2 },
    ],
    timeSpentSec: 218,
  };
}

function makeAttempt(): Attempt {
  return {
    id: "a1", quizId: "q1", examId: "ssc-cgl", title: "Test Quiz", kind: "practice",
    status: "submitted", startedAt: Date.now() - 300000, submittedAt: Date.now(), answers: {}, score: makeScore(),
    reportMarkdown: "", aiAnalysis: false,
  };
}

function makeQuiz(): Quiz {
  return {
    id: "q1", title: "Test Quiz", examId: "ssc-cgl", kind: "practice", difficulty: 2,
    subjects: ["Maths"], topics: ["Percentages"], totalDurationMin: 10, createdAt: 1, source: "ai",
    questions: [
      { id: "x", type: "mcq-single", subject: "M", topic: "P", difficulty: 2, marks: 2, negMarks: 0.5, text: "q", options: ["a", "b", "c", "d"], answerIndex: 0, explanation: "e", source: "ai" },
    ],
    sections: [{ name: "General", durationMin: 0, questionIds: ["x"] }],
  };
}

describe("buildReportMarkdown", () => {
  it("contains all report sections with AI data", () => {
    const ai = {
      verdict: "Decent attempt.", overview: "Overview text.",
      sectionInsights: [{ section: "Quant", observation: "Great" }],
      strengths: [{ title: "Percentages", detail: "3/3" }],
      weaknesses: [{ title: "Series", detail: "1/2", fix: "Drill" }],
      topicBreakdown: [{ topic: "Percentages", verdict: "strong", comment: "solid" }],
      actionPlan: ["Do X", "Do Y"],
      realityCheck: "Guessing hurt you.",
      motivation: "Keep going!",
    };
    const md = buildReportMarkdown({ attempt: makeAttempt(), quiz: makeQuiz(), exam: getExam("ssc-cgl"), score: makeScore(), ai });
    expect(md).toContain("Score Card");
    expect(md).toContain("Coach Verdict");
    expect(md).toContain("Reality Check");
    expect(md).toContain("Action Plan");
    expect(md).toContain("Topic Scorecard");
    expect(md).toContain("Rokky");
    expect(md).toContain("<svg"); // donut embedded
  });

  it("renders offline fallback when ai is null", () => {
    const md = buildReportMarkdown({ attempt: makeAttempt(), quiz: makeQuiz(), exam: getExam("ssc-cgl"), score: makeScore(), ai: null });
    expect(md).toContain("No AI analysis");
    expect(md).toContain("Analyze with AI");
  });

  it("fallbackReportData is honest about guesses", () => {
    const fb = fallbackReportData(makeScore());
    expect(fb.realityCheck.toLowerCase()).toContain("guess");
    expect(fb.topicBreakdown.length).toBe(3);
    expect(fb.actionPlan.length).toBeGreaterThan(0);
  });
});
