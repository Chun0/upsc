/**
 * REAL-MODEL integration tests (gated by RUN_AI=1 + GEMINI_API_KEY).
 * Uses the cheap models per the project brief: gemini-flash-lite-latest (slave)
 * and gemma-4-31b-it, with only 2 master calls on gemini-flash-latest.
 *
 * Run: RUN_AI=1 GEMINI_API_KEY=... npx vitest run tests/integration
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { orchestrator } from "../../lib/ai/orchestrator";
import { MCQ_SET_SCHEMA, SCORE_SCHEMA, REPORT_SCHEMA, FLASHCARDS_SCHEMA, OUTLINE_SCHEMA } from "../../lib/ai/schemas";
import { ctxQuiz, ctxScoreDescriptive, ctxAnalyzeAttempt, ctxFlashcards, ctxOutline } from "../../lib/ai/prompts";
import { getExam } from "../../lib/content/exams";
import { scoreQuiz } from "../../lib/engine/quiz";
import { mutateDb, reloadDb, addKey } from "../../lib/store/db";
import { parseJsonLoose } from "../../lib/utils";
import type { Quiz } from "../../lib/types";

const RUN = process.env.RUN_AI === "1";
const KEY = process.env.GEMINI_API_KEY;
const enabled = RUN && Boolean(KEY);

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "udaan-ai-"));

beforeAll(async () => {
  process.env.DATA_DIR = DIR;
  process.env.GEMINI_API_KEY = KEY || "";
  reloadDb();
  await mutateDb((db) => {
    db.settings = {
      masterModel: "gemini-flash-latest",
      slaveModel: "gemini-flash-lite-latest",
      thinkingLevel: "HIGH",
      enableSearch: false,
      rotation: "roundrobin",
      temperature: null,
      rateLimits: {},
    };
  });
  if (KEY) await addKey("integration-test-key", KEY);
});

describe.skipIf(!enabled)("REAL Gemini API — flash-lite / gemma / flash", () => {
  it("lists models on the provided key", async () => {
    const models = await orchestrator.listModels();
    expect(models.length).toBeGreaterThan(10);
    const names = models.map((m) => m.name);
    expect(names.some((n) => n.includes("flash-lite"))).toBe(true);
    expect(names.some((n) => n.includes("gemma"))).toBe(true);
  });

  it("SLAVE (gemini-flash-lite-latest): generates schema-valid MCQs", async () => {
    const exam = getExam("ssc-cgl")!;
    const out = await orchestrator.generateJson<{ questions: { question: string; options: string[]; answerIndex: number; explanation: string; subject: string; topic: string; difficulty: number }[] }>({
      lane: "slave",
      prompt: ctxQuiz(exam, { subject: "Quantitative Aptitude", count: 3, difficulty: 2, kind: "practice" }),
      schema: MCQ_SET_SCHEMA,
      timeoutMs: 180000,
    });
    expect(out.questions.length).toBeGreaterThanOrEqual(3);
    for (const q of out.questions) {
      expect(q.options.length).toBe(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.difficulty).toBeGreaterThanOrEqual(1);
      expect(q.difficulty).toBeLessThanOrEqual(5);
    }
  });

  it("SLAVE (gemma-4-31b-it): generates parseable MCQs", async () => {
    const exam = getExam("nda")!;
    const out = await orchestrator.generateJson<{ questions: { question: string; options: string[]; answerIndex: number; explanation: string; subject: string; topic: string; difficulty: number }[] }>({
      lane: "slave",
      model: "gemma-4-31b-it",
      prompt: ctxQuiz(exam, { subject: "Mathematics", count: 2, difficulty: 1, kind: "practice" }),
      schema: MCQ_SET_SCHEMA,
      timeoutMs: 180000,
    });
    expect(out.questions.length).toBeGreaterThanOrEqual(2);
    expect(out.questions[0].options.length).toBe(4);
  });

  it("SLAVE (flash-lite): outline for a summary", async () => {
    const exam = getExam("upsc-cse")!;
    const out = await orchestrator.generateJson<{ title: string; sections: { heading: string; keyPoints: string[] }[] }>({
      lane: "slave",
      prompt: ctxOutline(exam, "Polity & Governance", "Fundamental Rights", "concise"),
      schema: OUTLINE_SCHEMA,
    });
    expect(out.sections.length).toBeGreaterThanOrEqual(3);
    expect(out.sections[0].keyPoints.length).toBeGreaterThanOrEqual(2);
  });

  it("SLAVE (flash-lite): flashcards", async () => {
    const exam = getExam("rbi-grade-b")!;
    const out = await orchestrator.generateJson<{ cards: { front: string; back: string; topic: string }[] }>({
      lane: "slave",
      prompt: ctxFlashcards(exam, undefined, 4),
      schema: FLASHCARDS_SCHEMA,
    });
    expect(out.cards.length).toBeGreaterThanOrEqual(4);
    expect(out.cards[0].front.length).toBeGreaterThan(3);
  });

  it("MASTER (gemini-flash-latest): rubric-scores a descriptive answer", async () => {
    const exam = getExam("mppsc")!;
    const out = await orchestrator.generateJson<{ marksAwarded: number; maxMarks: number; band: string; feedback: string; modelAnswer: string }>({
      lane: "master",
      prompt: ctxScoreDescriptive(exam, "Discuss the role of Panchayati Raj institutions in rural development in Madhya Pradesh.", "Panchayati Raj helps villages. It gives power to people. MP has many panchayats.", 10, 200),
      schema: SCORE_SCHEMA,
      timeoutMs: 120000,
    });
    expect(out.marksAwarded).toBeGreaterThanOrEqual(0);
    expect(out.marksAwarded).toBeLessThanOrEqual(out.maxMarks);
    expect(["Excellent", "Good", "Average", "Poor", "Very Poor"]).toContain(out.band);
    expect(out.feedback.length).toBeGreaterThan(20);
  });

  it("MASTER (gemini-flash-latest): fills the report-card schema", async () => {
    const exam = getExam("ssc-cgl")!;
    const quiz: Quiz = {
      id: "iq", title: "AI Report Test", examId: exam.id, kind: "practice", difficulty: 2,
      subjects: ["Quant"], topics: ["Percentages"], totalDurationMin: 5, createdAt: Date.now(), source: "ai",
      questions: [
        { id: "q1", type: "mcq-single", subject: "Quant", topic: "Percentages", difficulty: 2, marks: 2, negMarks: 0.5, text: "If CP=100 and SP=120, profit % is?", options: ["10%", "15%", "20%", "25%"], answerIndex: 2, explanation: "20/100 = 20%", source: "ai" },
      ],
      sections: [{ name: "General", durationMin: 0, questionIds: ["q1"] }],
    };
    const score = scoreQuiz(quiz, { q1: { selected: ["1"], timeSpentMs: 6000 } }, Date.now() - 30000);
    const out = await orchestrator.generateJson<{ verdict: string; overview: string; sectionInsights: unknown[]; strengths: unknown[]; weaknesses: unknown[]; topicBreakdown: { topic: string; verdict: string; comment: string }[]; actionPlan: string[]; realityCheck: string; motivation: string }>({
      lane: "master",
      prompt: ctxAnalyzeAttempt(exam, quiz, score),
      schema: REPORT_SCHEMA,
      timeoutMs: 120000,
    });
    expect(out.verdict.length).toBeGreaterThan(3);
    expect(out.realityCheck.length).toBeGreaterThan(10);
    expect(out.topicBreakdown.length).toBeGreaterThan(0);
    expect(out.actionPlan.length).toBeGreaterThanOrEqual(3);
    expect(out.motivation.length).toBeGreaterThan(5);
  });

  it("MULTI-AGENT pipeline: slave drafts -> master validates (queue+wait)", async () => {
    const exam = getExam("rrb-ntpc")!;
    const draft = await orchestrator.generateJson<{ questions: { question: string; options: string[]; answerIndex: number; explanation: string; subject: string; topic: string; difficulty: number }[] }>({
      lane: "slave",
      prompt: ctxQuiz(exam, { count: 3, difficulty: 2, kind: "practice", subject: "Mathematics" }),
      schema: MCQ_SET_SCHEMA,
    });
    // cross-lane wait: master validates slave output
    const review = await orchestrator.generateJson<{ approved: boolean; corrections: { index: number; reason: string; replacement: unknown }[]; notes: string }>({
      lane: "master",
      prompt: `You are the senior examiner. Review this draft question set for ${exam.name}. Fix factual errors, ambiguous wording or wrong answers. Return ONLY JSON: {"approved": boolean, "corrections": [{"index": int, "reason": string, "replacement": {question object}}], "notes": string}. DRAFT:\n${JSON.stringify(draft.questions)}`,
      schema: {
        type: "OBJECT",
        required: ["approved", "corrections", "notes"],
        properties: {
          approved: { type: "BOOLEAN" },
          corrections: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              required: ["index", "reason", "replacement"],
              properties: { index: { type: "INTEGER" }, reason: { type: "STRING" }, replacement: { type: "OBJECT" } },
            },
          },
          notes: { type: "STRING" },
        },
      },
      timeoutMs: 120000,
    });
    expect(typeof review.approved).toBe("boolean");
    expect(review.notes.length).toBeGreaterThan(0);
    // apply corrections deterministically
    const final = [...draft.questions];
    for (const c of review.corrections || []) {
      if (Number.isInteger(c.index) && c.index >= 0 && c.index < final.length && c.replacement) {
        final[c.index] = c.replacement as never;
      }
    }
    expect(final.length).toBe(draft.questions.length);
  });

  it("orchestrator status exposes lane health", () => {
    const s = orchestrator.status();
    expect(s.hasKeys).toBe(true);
    expect(s.recentTasks.length).toBeGreaterThan(0);
  });
});

describe.skipIf(enabled)("skipped", () => {
  it("AI tests disabled (set RUN_AI=1 and GEMINI_API_KEY to run)", () => {
    expect(true).toBe(true);
  });
});
