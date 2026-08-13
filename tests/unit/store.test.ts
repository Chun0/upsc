import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getDb, saveDb, mutateDb, reloadDb, addKey, getSettings, defaultDb } from "../../lib/store/db";

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "udaan-store-"));

beforeAll(() => {
  process.env.DATA_DIR = DIR;
  reloadDb();
});

describe("JSON store", () => {
  it("starts with defaults when empty", () => {
    const db = getDb();
    expect(db.keys).toEqual([]);
    expect(db.attempts).toEqual([]);
    expect(db.topicStats).toEqual({});
  });

  it("persists mutations atomically", async () => {
    await mutateDb((db) => {
      db.quizzes.push({ id: "q1", title: "t", examId: "e", kind: "practice", difficulty: 1, subjects: [], topics: [], questions: [], sections: [], totalDurationMin: 10, createdAt: 1, source: "ai" } as never);
    });
    reloadDb();
    expect(getDb().quizzes.length).toBe(1);
    expect(getDb().quizzes[0].id).toBe("q1");
  });

  it("recovers from corrupt files with a backup", async () => {
    const p = path.join(DIR, "db.json");
    fs.writeFileSync(p, "{ not json !!!");
    reloadDb();
    const db = getDb();
    expect(db.quizzes).toEqual([]);
    const backups = fs.readdirSync(DIR).filter((f) => f.includes("corrupt"));
    expect(backups.length).toBeGreaterThan(0);
  });

  it("masks keys and never leaks raw key through helpers", async () => {
    const rec = await addKey("test", "super-secret-key-123");
    expect(rec.masked).not.toContain("super-secret-key-123");
    const db = getDb();
    expect(db.keys.find((k) => k.id === rec.id)?.masked).toBe("supe…-123");
  });

  it("default settings exist", () => {
    const s = getSettings();
    expect(s.masterModel).toContain("flash");
    expect(s.slaveModel).toContain("flash-lite");
    expect(s.thinkingLevel).toBe("HIGH");
  });

  it("defaultDb is fresh each time", () => {
    const a = defaultDb();
    const b = defaultDb();
    a.quizzes.push({} as never);
    expect(b.quizzes.length).toBe(0);
  });
});
