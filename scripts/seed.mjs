// Seed runtime db with an env-provided key + defaults. Usage: GEMINI_API_KEY=... node scripts/seed.mjs
import fs from "fs";
import path from "path";

const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = path.join(dir, "db.json");

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return key.slice(0, 4) + "…" + key.slice(-4);
}

let db = {
  profile: { name: "", targetExamId: "upsc-cse", dailyGoal: 50, onboarded: false },
  settings: {
    masterModel: "gemini-flash-latest",
    slaveModel: "gemini-flash-lite-latest",
    thinkingLevel: "HIGH",
    enableSearch: true,
    rotation: "roundrobin",
    temperature: null,
    rateLimits: {},
  },
  keys: [],
  quizzes: [],
  attempts: [],
  summaries: [],
  flashcards: [],
  topicStats: {},
  activity: [],
};

if (fs.existsSync(file)) {
  try {
    db = { ...db, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    /* corrupt -> start fresh */
  }
}

const key = process.env.GEMINI_API_KEY;
if (key && !db.keys.some((k) => k.key === key)) {
  db.keys.push({
    id: "seed-" + Math.random().toString(36).slice(2, 8),
    label: "Testing key",
    key,
    masked: maskKey(key),
    status: "ok",
    addedAt: Date.now(),
  });
}

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify(db, null, 2));
console.log("Seeded", file, "| keys:", db.keys.length, "| master:", db.settings.masterModel, "| slave:", db.settings.slaveModel);
