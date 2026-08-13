import { NextRequest, NextResponse } from "next/server";
import { getDb, mutateDb } from "@/lib/store/db";
import { getExam } from "@/lib/content/exams";
import { buildOfflineQuiz, miniMockPlan } from "@/lib/engine/quiz";
import { uid } from "@/lib/utils";
import type { Question, Quiz } from "@/lib/types";

interface AiMcq {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: number;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const examId = req.nextUrl.searchParams.get("examId");
  const db = getDb();
  const quizzes = db.quizzes
    .filter((q) => !examId || q.examId === examId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((q) => ({ id: q.id, title: q.title, examId: q.examId, kind: q.kind, createdAt: q.createdAt, questions: q.questions.length }));
  return NextResponse.json({ quizzes });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const db = getDb();

  // ---- offline build from bundled samples ----
  if (body.offline) {
    const exam = getExam(body.examId);
    if (!exam) return NextResponse.json({ error: "unknown exam" }, { status: 400 });
    const pattern = exam.patterns.find((p) => p.questions > 0) || exam.patterns[0];
    const negFrac = pattern.negFraction;
    const marksPerQ = pattern.marks / Math.max(1, pattern.questions);
    const quiz = buildOfflineQuiz(exam, {
      subject: body.subject,
      topics: body.topics,
      count: body.count || 10,
      difficulty: body.difficulty || 2,
      kind: body.kind || "practice",
      marksPerQ: Math.round(marksPerQ * 4) / 4 || 1,
      negFraction: negFrac,
    });
    await mutateDb((d) => d.quizzes.push(quiz));
    return NextResponse.json({ id: quiz.id, note: `Offline build: ${quiz.questions.length} questions from bundled PYQ-style samples.` });
  }

  // ---- AI quiz save ----
  if (Array.isArray(body.questions) && body.questions.length) {
    const exam = getExam(body.examId);
    const pattern = exam?.patterns.find((p) => p.questions > 0) || exam?.patterns[0];
    const negFrac = pattern?.negFraction ?? 0;
    const marksPerQ = pattern ? Math.round((pattern.marks / Math.max(1, pattern.questions)) * 4) / 4 || 1 : 1;
    const questions: Question[] = (body.questions as Partial<AiMcq>[]).map((q, i) => ({
      id: uid(10),
      type: "mcq-single",
      subject: q.subject || "General",
      topic: q.topic || "Mixed",
      difficulty: Math.max(1, Math.min(5, Number(q.difficulty) || 2)),
      marks: marksPerQ,
      negMarks: Math.round(marksPerQ * negFrac * 100) / 100,
      text: q.question || `Question ${i + 1}`,
      options: (q.options || []).slice(0, 4),
      answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : 0,
      explanation: q.explanation || "",
      source: "ai",
    }));
    const quiz: Quiz = {
      id: uid(10),
      title: body.title || "AI Practice Quiz",
      examId: body.examId,
      kind: body.kind === "mock" ? "mock" : "practice",
      difficulty: body.difficulty || 2,
      subjects: [...new Set(questions.map((q) => q.subject))],
      topics: [...new Set(questions.map((q) => q.topic))],
      questions,
      sections: [{ name: "General", durationMin: 0, questionIds: questions.map((q) => q.id) }],
      totalDurationMin: Math.max(5, Math.round(questions.length * 1.2)),
      createdAt: Date.now(),
      source: "ai",
    };
    await mutateDb((d) => d.quizzes.push(quiz));
    return NextResponse.json({ id: quiz.id });
  }

  return NextResponse.json({ error: "provide questions[] or offline:true" }, { status: 400 });
}
