// ============ Quiz engine: scoring with negative marking, guess audit, mock plans ============
import type { AnswerState, ExamDef, Question, Quiz, ScoreSummary, TopicScore, SectionScore } from "../types";
import { clamp, normalizeAnswer, round2, seededShuffle, uid } from "../utils";

export function qMarks(q: Question): number {
  return q.marks > 0 ? q.marks : 1;
}
export function qNeg(q: Question): number {
  return q.negMarks > 0 ? q.negMarks : 0;
}

/** Normalize a stored answer into a comparable value. */
export function normalizedSelection(a?: AnswerState): string[] {
  return (a?.selected || []).map((s) => normalizeAnswer(s)).filter((s) => s.length > 0);
}

export function isCorrect(q: Question, a?: AnswerState): boolean {
  const sel = normalizedSelection(a);
  if (!sel.length) return false;
  if (q.type === "mcq-single" || q.type === "truefalse") {
    if (q.answerIndex != null && q.options?.length) {
      return sel.length === 1 && sel[0] === String(q.answerIndex);
    }
    if (q.answerText != null) return sel[0] === normalizeAnswer(q.answerText);
    return false;
  }
  if (q.type === "mcq-multi") {
    if (q.answerText != null) {
      const correct = q.answerText.split(",").map((s) => normalizeAnswer(s.trim())).sort();
      const got = [...sel].sort();
      return correct.length === got.length && correct.every((c, i) => c === got[i]);
    }
    return false;
  }
  if (q.type === "fill") {
    return sel[0] === normalizeAnswer(q.answerText || "");
  }
  return false; // descriptive never auto-correct
}

const GUESS_THRESHOLD_MS = 8000;

export function scoreQuiz(quiz: Quiz, answers: Record<string, AnswerState>, startedAt: number): ScoreSummary {
  let obtained = 0, max = 0, attempted = 0, correct = 0, wrong = 0, unattempted = 0;
  let guessed = 0, guessedCorrect = 0, guessedWrong = 0;
  const sectionMap = new Map<string, SectionScore>();
  const topicMap = new Map<string, TopicScore>();
  const seen = new Set<string>();
  let timeSpentSec = 0;

  const sectionName = (q: Question) => q.section || "General";

  for (const q of quiz.questions) {
    const a = answers[q.id];
    const marks = qMarks(q);
    const neg = qNeg(q);
    max += marks;

    // section init
    const sname = sectionName(q);
    if (!sectionMap.has(sname)) {
      sectionMap.set(sname, { name: sname, questions: 0, attempted: 0, correct: 0, wrong: 0, unattempted: 0, obtained: 0, max: 0, accuracy: 0 });
    }
    const sec = sectionMap.get(sname)!;
    sec.questions++;
    sec.max += marks;

    // topic init
    const tkey = `${q.subject}||${q.topic}`;
    if (!topicMap.has(tkey)) {
      topicMap.set(tkey, { subject: q.subject, topic: q.topic, attempted: 0, correct: 0, wrong: 0, unattempted: 0, obtained: 0, max: 0 });
    }
    const top = topicMap.get(tkey)!;
    top.max += marks;

    const sel = normalizedSelection(a);
    const spent = a?.timeSpentMs != null ? a.timeSpentMs : 0;
    timeSpentSec += spent / 1000;

    if (!sel.length) {
      unattempted++;
      sec.unattempted++;
      top.unattempted++;
      continue;
    }

    // de-duplicate repeated topic contributions (same subject+topic counted once for seen tracking only)
    attempted++;
    sec.attempted++;
    top.attempted++;

    if (isCorrect(q, a)) {
      correct++;
      sec.correct++;
      top.correct++;
      obtained += marks;
      sec.obtained += marks;
      top.obtained += marks;
      if (spent > 0 && spent < GUESS_THRESHOLD_MS) {
        guessed++;
        guessedCorrect++;
      }
    } else {
      wrong++;
      sec.wrong++;
      top.wrong++;
      const penalty = Math.min(neg, marks); // penalty capped at question marks
      obtained -= penalty;
      sec.obtained -= penalty;
      top.obtained -= penalty;
      if (spent > 0 && spent < GUESS_THRESHOLD_MS) {
        guessed++;
        guessedWrong++;
      }
    }
  }

  for (const sec of sectionMap.values()) sec.accuracy = sec.attempted ? round2(sec.correct / sec.attempted) : 0;
  const perSection = [...sectionMap.values()];
  const perTopic = [...topicMap.values()];
  const accuracy = attempted ? round2(correct / attempted) : 0;
  const percent = max ? round2((obtained / max) * 100) : 0;
  const floor = 0;

  return {
    obtained: Math.max(floor, round2(obtained)),
    max,
    attempted,
    correct,
    wrong,
    unattempted,
    accuracy,
    percent,
    guessAudit: { guessed, guessedCorrect, guessedWrong },
    perSection,
    perTopic,
    timeSpentSec: Math.round(timeSpentSec),
  };
}

/** Break-even accuracy with negative marking: guesses hurt below this. */
export function breakEvenAccuracy(negFraction: number): number {
  // EV >= 0: p*m - (1-p)*neg >= 0 -> p >= neg/(m+neg)
  const neg = Math.max(0, negFraction);
  return round2(neg / (1 + neg));
}

/** Build a proportional mini-mock plan from an exam pattern. */
export function miniMockPlan(
  exam: ExamDef,
  stageName: string | undefined,
  maxQuestions = 25
): { sections: { name: string; questions: number; marks: number; durationMin: number; negFraction: number }[]; totalMarks: number; totalDurationMin: number } {
  const pattern = exam.patterns.find((p) => (stageName ? p.stage === stageName : p.questions > 0)) || exam.patterns[0];
  // descriptive sections (Mains answer-writing) are never turned into MCQs — skip them
  const sections = pattern.sections.filter((s) => s.questions > 0 && s.mode !== "descriptive");
  const totalQ = sections.reduce((a, s) => a + s.questions, 0) || 1;
  const scale = maxQuestions / totalQ;
  const perQ = pattern.marks / (pattern.questions || 1);

  const out = sections.map((s) => {
    const q = Math.max(1, Math.round(s.questions * scale));
    const marksPerQ = s.marks > 0 && s.questions > 0 ? s.marks / s.questions : perQ;
    const durationMin = s.durationMin ? Math.max(1, Math.round(s.durationMin * scale)) : Math.max(1, Math.round(pattern.durationMin * (s.questions / totalQ) * scale));
    return { name: s.name, questions: q, marks: round2(q * marksPerQ), durationMin, negFraction: pattern.negFraction };
  });
  const totalMarks = round2(out.reduce((a, s) => a + s.marks, 0));
  const totalDurationMin = out.reduce((a, s) => a + s.durationMin, 0);
  return { sections: out, totalMarks, totalDurationMin };
}

/** Loose keyword map from section names to syllabus subjects (for offline mocks). */
const SECTION_SUBJECT_HINTS: [string, string[]][] = [
  ["quantitative", ["Quantitative Aptitude", "Mathematics", "Elementary Mathematics", "Data Analysis"]],
  ["mathematical", ["Quantitative Aptitude", "Mathematics"]],
  ["mathematics", ["Mathematics", "Elementary Mathematics"]],
  ["reasoning", ["General Intelligence & Reasoning", "Reasoning Ability", "Reasoning & Military Aptitude"]],
  ["intelligence", ["General Intelligence & Reasoning", "Reasoning Ability"]],
  ["english", ["English", "English Language", "Verbal Ability in English", "English (GAT)"]],
  ["comprehension", ["English", "English Language"]],
  ["verbal", ["Verbal Ability in English", "English"]],
  ["awareness", ["General Awareness", "General Awareness & Current Affairs", "General / Banking Awareness", "General / Economy / Banking Awareness", "General Awareness (Phase 1)"]],
  ["knowledge", ["General Knowledge", "General Knowledge & Science"]],
  ["general", ["General Awareness", "General Studies", "General Knowledge"]],
  ["numerical", ["Numerical Ability", "Quantitative Aptitude"]],
  ["data", ["Data Analysis & Interpretation"]],
  ["fm", ["Finance & Management"]],
  ["finance", ["Finance & Management"]],
  ["esi", ["Economic & Social Issues (ESI)"]],
  ["economic", ["Economic & Social Issues (ESI)"]],
  ["computer", ["Computer Aptitude", "Computer Knowledge (Tier II)", "Computer (Tier II)"]],
  ["science", ["General Science", "General Knowledge & Science", "Science & Technology"]],
  ["aptitude", ["CSAT Aptitude", "Quantitative Aptitude"]],
  ["csat", ["CSAT Aptitude"]],
  ["teaching", ["Paper 1 — Teaching & Research Aptitude"]],
  ["child", ["Child Development & Pedagogy"]],
];

/** Offline quiz builder from sample questions (no API needed). */
export function buildOfflineQuiz(
  exam: ExamDef,
  opts: { subject?: string; topics?: string[]; count?: number; difficulty?: number; marksPerQ?: number; negFraction?: number; kind?: "practice" | "mock"; sectionName?: string }
): Quiz {
  let pool = [...exam.samples];
  if (opts.subject) pool = pool.filter((s) => s.s === opts.subject);
  if (opts.topics?.length) pool = pool.filter((s) => opts.topics!.some((t) => s.t.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(s.t.toLowerCase())));
  // mock section -> subject hints (so a "Quantitative Aptitude" section gets quant samples)
  if (opts.kind === "mock" && opts.sectionName) {
    const section = opts.sectionName.toLowerCase();
    const hinted = SECTION_SUBJECT_HINTS.filter(([key]) => section.includes(key)).flatMap(([, subs]) => subs);
    const candidates = pool.filter((s) => hinted.some((h) => h.toLowerCase() === s.s.toLowerCase()));
    if (candidates.length) pool = candidates;
    else pool = pool.filter((s) => section.includes(s.s.toLowerCase()) || s.s.toLowerCase().includes(section.replace(/—.*$/, "").trim()));
  }
  if (!pool.length) pool = [...exam.samples];
  const count = clamp(opts.count || 10, 1, pool.length);
  const chosen = seededShuffle(pool, Date.now() % 100000).slice(0, count);
  const negFrac = opts.negFraction ?? 0;
  const marksPerQ = opts.marksPerQ ?? 2;
  const pattern = exam.patterns.find((p) => p.questions > 0) || exam.patterns[0];

  const questions: Question[] = chosen.map((s) => ({
    id: uid(10),
    type: "mcq-single",
    subject: s.s,
    topic: s.t,
    difficulty: s.d || 2,
    marks: marksPerQ,
    negMarks: round2(marksPerQ * negFrac),
    text: s.q,
    options: s.o,
    answerIndex: s.a ?? 0,
    explanation: s.x,
    section: opts.sectionName || "General",
    source: "sample",
  }));

  return {
    id: uid(10),
    title: `${exam.name} • ${opts.kind === "mock" ? "Offline Mini Mock" : "Sample Practice"}${opts.subject ? " • " + opts.subject : ""}`,
    examId: exam.id,
    kind: opts.kind === "mock" ? "mock" : "practice",
    difficulty: opts.difficulty || 2,
    subjects: [...new Set(questions.map((q) => q.subject))],
    topics: [...new Set(questions.map((q) => q.topic))],
    questions,
    sections: [{ name: opts.sectionName || "General", durationMin: 0, questionIds: questions.map((q) => q.id) }],
    totalDurationMin: pattern ? Math.round((count / pattern.questions) * pattern.durationMin) : Math.max(5, count),
    createdAt: Date.now(),
    source: "sample",
  };
}
