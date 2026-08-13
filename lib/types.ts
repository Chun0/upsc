// ============ Core shared types for UDAAN ============

export interface StageDef {
  name: string;
  mode: "objective" | "descriptive" | "interview" | "skill" | "physical";
  note?: string;
}
export interface SectionDef {
  name: string;
  questions: number;
  marks: number;
  durationMin?: number;
}
export interface PatternDef {
  stage: string;
  durationMin: number;
  questions: number;
  marks: number;
  negative: string;
  negFraction: number;
  sections: SectionDef[];
  notes?: string[];
}
export interface TopicDef {
  name: string;
  weight: number; // relative within subject (0..1, sums to ~1)
  pyq: number; // 1..5 PYQ frequency (editorial estimate)
  difficulty: number; // 1..5
  sub?: string[];
}
export interface SubjectDef {
  subject: string;
  weight: number; // relative within exam (0..1)
  topics: TopicDef[];
}
export interface SampleQ {
  q: string;
  o?: string[];
  a?: number; // answer index for MCQ
  x: string; // explanation / model answer hint
  s: string; // subject
  t: string; // topic
  d: number; // difficulty 1..5
  m?: number; // marks
  w?: number; // word limit (descriptive)
}
export interface PlanPhase {
  name: string;
  weeks: number;
  focus: string;
  tasks: string[];
}
export interface ExamDef {
  id: string;
  name: string;
  fullName: string;
  org: string;
  icon: string;
  color: string;
  tagline: string;
  overview: string;
  eligibility: string[];
  age: string;
  attempts: string;
  stages: StageDef[];
  patterns: PatternDef[];
  syllabus: SubjectDef[];
  trends: string[];
  sources: string[];
  samples: SampleQ[];
  plan: { weeks: number; hoursPerDay: number; phases: PlanPhase[] };
}

// ============ Question / Quiz ============

export type QType = "mcq-single" | "mcq-multi" | "truefalse" | "fill" | "descriptive";

export interface Question {
  id: string;
  type: QType;
  subject: string;
  topic: string;
  difficulty: number; // 1..5
  marks: number;
  negMarks: number; // absolute penalty for wrong (0 if none)
  text: string;
  options?: string[];
  answerIndex?: number;
  answerText?: string;
  explanation?: string;
  section?: string;
  source?: "ai" | "sample";
}

export interface QuizSection {
  name: string;
  durationMin: number; // 0 = shared timer
  questionIds: string[];
}

export interface Quiz {
  id: string;
  title: string;
  examId: string;
  kind: "practice" | "mock" | "descriptive";
  difficulty: number;
  subjects: string[];
  topics: string[];
  questions: Question[];
  sections: QuizSection[];
  totalDurationMin: number;
  createdAt: number;
  source: "ai" | "sample";
  meta?: Record<string, string>;
}

// ============ Attempts ============

export interface AnswerState {
  selected?: string[]; // for mcq-single: [index]; mcq-multi: indices; fill: [text]; descriptive: [text]
  markedForReview?: boolean;
  firstSeenAt?: number;
  lastChangedAt?: number;
  timeSpentMs?: number;
}

export interface SectionScore {
  name: string;
  questions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  obtained: number;
  max: number;
  accuracy: number;
}

export interface TopicScore {
  subject: string;
  topic: string;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  obtained: number;
  max: number;
}

export interface ScoreSummary {
  obtained: number;
  max: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  accuracy: number; // 0..1
  percent: number; // 0..100
  guessAudit: { guessed: number; guessedCorrect: number; guessedWrong: number };
  perSection: SectionScore[];
  perTopic: TopicScore[];
  timeSpentSec: number;
}

export interface ReportData {
  verdict: string;
  overview: string;
  sectionInsights: { section: string; observation: string }[];
  strengths: { title: string; detail: string }[];
  weaknesses: { title: string; detail: string; fix: string }[];
  topicBreakdown: { topic: string; verdict: string; comment: string }[];
  actionPlan: string[];
  realityCheck: string;
  motivation: string;
}

export interface Attempt {
  id: string;
  quizId: string;
  examId: string;
  title: string;
  kind: "practice" | "mock" | "descriptive";
  status: "in-progress" | "submitted";
  startedAt: number;
  submittedAt?: number;
  answers: Record<string, AnswerState>;
  score?: ScoreSummary;
  reportMarkdown?: string;
  reportJson?: ReportData;
  aiAnalysis?: boolean;
  aiError?: string;
}

// ============ Study material ============

export interface SummaryDoc {
  id: string;
  examId: string;
  subject: string;
  topic: string;
  title: string;
  markdown: string;
  style: "concise" | "detailed" | "eli5";
  createdAt: number;
  wordCount: number;
  readProgress: number; // 0..1
  timesRead: number;
  lastReadAt?: number;
}

// ============ Flashcards & revision ============

export interface Flashcard {
  id: string;
  examId: string;
  subject: string;
  topic: string;
  front: string;
  back: string;
  createdAt: number;
  dueAt: number;
  intervalDays: number;
  ease: number; // SM-2 ease factor, starts 2.5
  lapses: number;
  source?: string; // questionId or 'ai'
}

// ============ Mastery / analytics ============

export interface TopicStat {
  examId: string;
  subject: string;
  topic: string;
  ewma: number; // 0..1 mastery estimate
  n: number; // attempts count
  lastSeen: number; // epoch ms
  confidence: number; // 0..1
  history: number[]; // last 12 raw per-question weighted scores
  weakStreak: number; // consecutive below-threshold interactions
}

export interface StudyPlan {
  examId: string;
  weeks: number;
  hoursPerDay: number;
  createdAt: number;
  phases: PlanPhase[];
  weekly: { week: number; focus: string; tasks: string[] }[];
}

export interface ActivityEvent {
  date: string; // YYYY-MM-DD
  type: "quiz" | "mock" | "descriptive" | "study" | "revision" | "digest";
  examId: string;
  label: string;
  meta?: Record<string, string | number>;
}

// ============ Settings / Keys ============

export interface ApiKeyRec {
  id: string;
  label: string;
  key: string; // raw key — stored ONLY in gitignored ./data
  masked: string;
  status: "ok" | "unverified" | "error";
  lastError?: string;
  addedAt: number;
  lastUsedAt?: number;
}

export interface Settings {
  masterModel: string;
  slaveModel: string;
  thinkingLevel: "HIGH" | "LOW";
  enableSearch: boolean;
  rotation: "roundrobin" | "failover";
  temperature: number | null;
  rateLimits: Record<string, number>; // exact model -> rpm
}

export interface Profile {
  name: string;
  targetExamId: string;
  examDate?: string; // YYYY-MM-DD
  dailyGoal: number;
  onboarded: boolean;
}

export interface DbData {
  profile?: Profile;
  settings?: Settings;
  keys: ApiKeyRec[];
  quizzes: Quiz[];
  attempts: Attempt[];
  summaries: SummaryDoc[];
  flashcards: Flashcard[];
  topicStats: Record<string, TopicStat>; // `${examId}::${subject}::${topic}`
  studyPlan?: StudyPlan;
  activity: ActivityEvent[];
}

export interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}
