import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { computeStreak, activityMap, scoreTrend, attemptsForExam, subjectRadar, readinessGauge } from "../../lib/engine/analytics";
import { getDb, mutateDb, reloadDb } from "../../lib/store/db";
import { getExam } from "../../lib/content/exams";
import { topicKey, updateTopicStat } from "../../lib/engine/mastery";
import type { Attempt, DbData } from "../../lib/types";

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "udaan-analytics-"));

beforeAll(() => {
  process.env.DATA_DIR = DIR;
  reloadDb();
});

function seedAttempt(examId: string, percent: number, submittedAt: number): Attempt {
  return {
    id: "a" + Math.random().toString(36).slice(2, 8),
    quizId: "q", examId, title: "t", kind: "practice", status: "submitted",
    startedAt: submittedAt - 60000, submittedAt,
    answers: {}, aiAnalysis: false,
    score: {
      obtained: percent, max: 100, attempted: 50, correct: Math.round(percent / 2), wrong: 10, unattempted: 5,
      accuracy: 0.8, percent,
      guessAudit: { guessed: 5, guessedCorrect: 2, guessedWrong: 3 },
      perSection: [], perTopic: [], timeSpentSec: 600,
    },
  };
}

describe("analytics selectors", () => {
  it("filters attempts by exam and status", async () => {
    await mutateDb((db) => {
      db.attempts = [seedAttempt("e1", 60, Date.now() - 1000), seedAttempt("e2", 70, Date.now() - 2000), { ...seedAttempt("e1", 50, Date.now() - 3000), status: "in-progress" }];
    });
    const db = getDb();
    expect(attemptsForExam(db, "e1").length).toBe(1);
    expect(scoreTrend(attemptsForExam(db, "e1")).length).toBe(1);
  });

  it("computes streak from activity", async () => {
    const today = new Date();
    const y = (off: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - off);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${m}-${day}`;
    };
    await mutateDb((db) => {
      db.activity = [
        { date: y(0), type: "quiz", examId: "e", label: "x" },
        { date: y(1), type: "quiz", examId: "e", label: "x" },
        { date: y(2), type: "quiz", examId: "e", label: "x" },
        { date: y(4), type: "quiz", examId: "e", label: "x" }, // gap at 3
      ];
    });
    expect(computeStreak(getDb())).toBe(3);
  });

  it("builds 60-day activity heatmap", async () => {
    await mutateDb((db) => {
      db.activity = [{ date: new Date().toISOString().slice(0, 10), type: "quiz", examId: "e", label: "x" }];
    });
    const map = activityMap(getDb(), 60);
    expect(map.length).toBe(60);
    expect(map[map.length - 1].count).toBe(1);
  });

  it("subject radar weights topics", async () => {
    const exam = getExam("ssc-cgl")!;
    await mutateDb((db) => {
      db.topicStats = {};
      const s = exam.syllabus[0];
      const t = s.topics[0];
      db.topicStats[topicKey(exam.id, s.subject, t.name)] = updateTopicStat(undefined, 0.9, Date.now(), { examId: exam.id, subject: s.subject, topic: t.name });
    });
    const radar = subjectRadar(getDb(), exam);
    expect(radar.length).toBe(exam.syllabus.length);
    const quant = radar.find((r) => r.subject === exam.syllabus[0].subject)!;
    expect(quant.readiness).toBeGreaterThan(0);
  });

  it("readiness gauge returns bounded values", async () => {
    const exam = getExam("ssc-cgl")!;
    const g = readinessGauge(getDb(), exam);
    expect(g.overall).toBeGreaterThanOrEqual(0);
    expect(g.overall).toBeLessThanOrEqual(100);
  });
});
