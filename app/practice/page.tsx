"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { listExams, getExam } from "@/lib/content/exams";
import { useToast } from "@/components/ui/Toast";
import type { ExamDef } from "@/lib/types";

function Builder() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const exams = useMemo(() => listExams(), []);
  const [examId, setExamId] = useState(sp.get("exam") || "upsc-cse");
  const exam: ExamDef = getExam(examId) || exams[0];
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState<string[]>(() => {
    const t = sp.get("topic");
    return t ? [t] : [];
  });
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState(2);
  const [genning, setGenning] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setHasKey(Boolean(d.hasKeys)))
      .catch(() => undefined);
  }, []);

  const subjectTopics = useMemo(() => {
    if (!subject) return [];
    return exam.syllabus.find((s) => s.subject === subject)?.topics.map((t) => t.name) || [];
  }, [exam, subject]);

  const pattern = exam.patterns.find((p) => p.questions > 0) || exam.patterns[0];
  const negFrac = pattern.negFraction;

  const build = async (offline: boolean) => {
    setGenning(true);
    try {
      let quizId: string | null = null;
      if (offline) {
        const res = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offline: true,
            examId: exam.id,
            subject: subject || undefined,
            topics: topics.length ? topics : undefined,
            count,
            difficulty,
            kind: "practice",
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "offline build failed");
        quizId = (await res.json()).id;
      } else {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "quiz",
            payload: { examId: exam.id, subject: subject || undefined, topics: topics.length ? topics : undefined, count, difficulty, kind: "practice" },
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "generation failed");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const res2 = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: exam.id,
            title: `${exam.name} • ${subject || "Mixed"} • AI Practice`,
            difficulty,
            kind: "practice",
            questions: data.questions,
          }),
        });
        if (!res2.ok) throw new Error((await res2.json()).error || "save failed");
        quizId = (await res2.json()).id;
      }
      if (quizId) router.push(`/quiz/${quizId}`);
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setGenning(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Practice</div>
        <h1>Set a paper, fill the bubbles</h1>
        <p className="dim" style={{ maxWidth: 660 }}>
          A focused quiz on one subject or topic, in the exam&apos;s own pattern — negative marking included,
          guesses audited on every report.
        </p>
      </div>

      <div className="split">
        <div className="side-sticky">
          <div className="card">
            <h3 style={{ fontFamily: "var(--font-display)" }}>Build your quiz</h3>
            <div className="field mt8">
              <label className="fld">Exam</label>
              <select value={examId} onChange={(e) => { setExamId(e.target.value); setSubject(""); setTopics([]); }}>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.icon} {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="fld">Subject (optional)</label>
              <select value={subject} onChange={(e) => { setSubject(e.target.value); setTopics([]); }}>
                <option value="">All subjects</option>
                {exam.syllabus.map((s) => (
                  <option key={s.subject} value={s.subject}>
                    {s.subject}
                  </option>
                ))}
              </select>
            </div>
            {subjectTopics.length > 0 ? (
              <div className="field">
                <label className="fld">Topics ({topics.length || "all"})</label>
                <div className="row" style={{ gap: 6 }}>
                  {subjectTopics.map((t) => (
                    <button key={t} className={`chip${topics.includes(t) ? " on" : ""}`} onClick={() => setTopics((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}>
                      {t.length > 26 ? t.slice(0, 25) + "…" : t}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="field">
              <label className="fld">Questions: {count}</label>
              <input type="range" min={5} max={30} step={5} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <div className="field">
              <label className="fld">Difficulty: {difficulty}/5 ({["", "Easy", "Easy-Moderate", "Moderate", "Moderate-Hard", "Hard"][difficulty]})</label>
              <input type="range" min={1} max={5} step={1} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} />
            </div>
            <button className="btn primary grow" onClick={() => build(false)} disabled={genning || !hasKey}>
              {genning ? <span className="spinner" /> : "✎"} {genning ? "Rokky is writing…" : "Generate with AI"}
            </button>
            <div className="row mt8">
              <button className="btn grow" onClick={() => build(true)} disabled={genning}>
                Sample questions (offline)
              </button>
            </div>
            {!hasKey ? <div className="hint mt8">AI generation needs a Gemini key — Settings → Models &amp; Keys. Offline mode uses bundled PYQ-style samples.</div> : null}
          </div>
        </div>

        <div>
          <div className="card" style={{ borderTop: "3px solid var(--ink)" }}>
            <div className="row">
              <div className="exam-ico" style={{ background: `${exam.color}14`, border: `1px solid ${exam.color}55` }}>{exam.icon}</div>
              <div>
                <div className="eyebrow">Question paper cover</div>
                <h2 style={{ margin: "2px 0 0" }}>{exam.name}</h2>
                <div className="dim small">{pattern.stage}</div>
              </div>
              <Link href={`/exams/${exam.id}`} className="btn small ghost right">Exam details →</Link>
            </div>
            <div className="divider" />
            <div className="pattern-row"><span className="k">Questions</span><span className="v">{pattern.questions} Q</span></div>
            <div className="pattern-row"><span className="k">Marks</span><span className="v">{pattern.marks}</span></div>
            <div className="pattern-row"><span className="k">Duration</span><span className="v">{pattern.durationMin} min</span></div>
            <div className="pattern-row"><span className="k">Negative marking</span><span className="v" style={{ color: negFrac > 0 ? "var(--red)" : "var(--tick)" }}>{pattern.negative}</span></div>
            <div className="pattern-row"><span className="k">Subjects mapped</span><span className="v">{exam.syllabus.length}</span></div>
            {negFrac > 0 ? (
              <p className="small dim mt16">
                Strategy note: with this negative marking, guessing only pays above {Math.round((negFrac / (1 + negFrac)) * 100)}% accuracy — Rokky audits your guesses in every report.
              </p>
            ) : (
              <p className="small dim mt16">No negative marking here — attempt every question. Rokky will remind you.</p>
            )}
          </div>

          <div className="card mt16" style={{ padding: "8px 18px 14px" }}>
            <div className="card-title-row" style={{ padding: "10px 2px 6px" }}>
              <h3 style={{ fontFamily: "var(--font-display)" }}>Recent quizzes</h3>
              <span className="eyebrow right">{exam.name}</span>
            </div>
            <RecentQuizzes examId={exam.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentQuizzes({ examId }: { examId: string }) {
  const [quizzes, setQuizzes] = useState<{ id: string; title: string; createdAt: number; kind: string }[]>([]);
  useEffect(() => {
    fetch("/api/quizzes?examId=" + examId)
      .then((r) => r.json())
      .then((d) => setQuizzes((d.quizzes || []).slice(0, 8)))
      .catch(() => undefined);
  }, [examId]);
  if (!quizzes.length) return <div className="dim small">No saved quizzes yet for this exam.</div>;
  return (
    <div>
      {quizzes.map((q) => (
        <Link key={q.id} href={`/quiz/${q.id}`} className="topic-row" style={{ color: "inherit" }}>
          <span className="name" style={{ fontWeight: 600 }}>
            {q.title}
            <small>
              {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} • {q.kind}
            </small>
          </span>
          <span className="small muted">take →</span>
        </Link>
      ))}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="loading-block"><span className="spinner" /> Loading builder…</div>}>
      <Builder />
    </Suspense>
  );
}
