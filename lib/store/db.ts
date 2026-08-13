// ============ JSON file store (single-user, atomic writes) ============
// Runtime data lives in ./data (gitignored). Env DATA_DIR overrides (used by tests).
import fs from "fs";
import path from "path";
import type { DbData } from "../types";
import { uid, maskKey } from "../utils";

export function dataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

export function dbPath(): string {
  return path.join(dataDir(), "db.json");
}

export function defaultDb(): DbData {
  return {
    keys: [],
    quizzes: [],
    attempts: [],
    summaries: [],
    flashcards: [],
    topicStats: {},
    activity: [],
  };
}

let cache: DbData | null = null;
let writeChain: Promise<void> = Promise.resolve();
let loadedPath = "";

export function getDb(): DbData {
  const p = dbPath();
  if (cache && loadedPath === p) return cache;
  if (!fs.existsSync(p)) {
    cache = defaultDb();
    loadedPath = p;
    return cache;
  }
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbData>;
    const base = defaultDb();
    cache = { ...base, ...parsed } as DbData;
    loadedPath = p;
  } catch (err) {
    // Corrupt file: back it up and start fresh rather than crashing.
    try {
      fs.copyFileSync(p, p + ".corrupt-" + Date.now());
    } catch {
      /* ignore */
    }
    cache = defaultDb();
    loadedPath = p;
  }
  return cache;
}

export function reloadDb(): DbData {
  cache = null;
  return getDb();
}

/** Serialized, atomic write: tmp file + rename. */
export function saveDb(): Promise<void> {
  const data = JSON.stringify(getDb(), null, 2);
  writeChain = writeChain.then(() => {
    const dir = dataDir();
    fs.mkdirSync(dir, { recursive: true });
    const tmp = dbPath() + ".tmp";
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, dbPath());
  });
  return writeChain;
}

export async function mutateDb<T>(fn: (db: DbData) => T | Promise<T>): Promise<T> {
  const db = getDb();
  const out = await fn(db);
  await saveDb();
  return out;
}

// ---------- Profile / settings helpers ----------

export function defaultSettings() {
  return {
    masterModel: "gemini-flash-latest",
    slaveModel: "gemini-flash-lite-latest",
    thinkingLevel: "HIGH" as const,
    enableSearch: true,
    rotation: "roundrobin" as const,
    temperature: null as number | null,
    rateLimits: {} as Record<string, number>,
  };
}

export function getSettings() {
  const db = getDb();
  if (!db.settings) db.settings = defaultSettings();
  return db.settings;
}

export function getProfile() {
  const db = getDb();
  if (!db.profile) db.profile = { name: "", targetExamId: "upsc-cse", dailyGoal: 50, onboarded: false };
  return db.profile;
}

// ---------- Keys ----------

export function addKey(label: string, key: string) {
  return mutateDb((db) => {
    const rec = {
      id: uid(8),
      label: label || "Key " + (db.keys.length + 1),
      key: key.trim(),
      masked: maskKey(key.trim()),
      status: "unverified" as const,
      addedAt: Date.now(),
    };
    db.keys.push(rec);
    return rec;
  });
}

export function removeKey(id: string) {
  return mutateDb((db) => {
    db.keys = db.keys.filter((k) => k.id !== id);
  });
}

export function setKeyStatus(id: string, status: "ok" | "error", lastError?: string) {
  return mutateDb((db) => {
    const k = db.keys.find((k) => k.id === id);
    if (k) {
      k.status = status;
      if (lastError) k.lastError = lastError;
      k.lastUsedAt = Date.now();
    }
  });
}

export function logActivity(type: string, examId: string, label: string, meta?: Record<string, string | number>) {
  return mutateDb((db) => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const date = `${d.getFullYear()}-${m}-${day}`;
    db.activity.push({ date, type: type as never, examId, label, meta });
    // keep only last 400 events
    if (db.activity.length > 400) db.activity = db.activity.slice(-400);
  });
}
