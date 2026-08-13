"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listExams, getExam } from "@/lib/content/exams";
import { useToast } from "@/components/ui/Toast";
import type { ExamDef } from "@/lib/types";

interface PaperQ {
  question: string;
  marks: number;
  wordLimit: number;
  section: string;
  hints: string;
}

function DescriptiveSetup() {
  const router = useRouter();
  const { toast } = useToast();
  const exams = useMemo(() => listExams(), []);
  const [examId, setExamId] = useState("upsc-cse");
  const exam: ExamDef = getExam(examId) || exams[0];
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState<PaperQ[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [scoring, setScoring] = useState(false);
  const [results, setResults] = useState<{ marksAwarded: number; maxMarks: number; band: string; feedback: string; modelAnswer: string }[] | null>(null);

  const generatePaper = async () => {
    setBusy(true);
    setPaper(null);
    setAnswers({});
    setResults(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "descriptive-paper", payload: { examId: exam.id, count } }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "paper generation failed");
      const data = await res.json();
      setPaper(data.questions || []);
      toast(`Paper set: ${data.questions?.length || 0} questions for ${exam.name}`, "success");
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setBusy(false);
    }
  };

  const scoreAll = async () => {
    if (!paper) return;
    setScoring(true);
    const out: typeof results = [];
    try {
      for (let i = 0; i < paper.length; i++) {
        const q = paper[i];
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "score",
            payload: { examId: exam.id, question: q.question, answer: answers[i] || "", maxMarks: q.marks, wordLimit: q.wordLimit },
          }),
        });
        if (!res.ok) throw new Error(`Q${i + 1}: ${(await res.json()).error || "scoring failed"}`);
        out.push(await res.json());
      }
      setResults(out);
      toast("All answers scored — board-examiner standard!", "success");
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setScoring(false);
    }
  };

  const totalAwarded = results?.reduce((a, r) => a + Number(r.marksAwarded || 0), 0) || 0;
  const totalMax = results?.reduce((a, r) => a + Number(r.maxMarks || 0), 0) || 0;

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Descriptive</div>
        <h1>The answer booklet</h1>
        <p className="dim" style={{ maxWidth: 660 }}>
          Mains-style questions with word limits, scored against a board-examiner rubric — content, structure,
          examples and language, marked in red like the real thing.
        </p>
      </div>

      <div className="card">
        <div className="row">
          <div className="exam-ico" style={{ background: `${exam.color}14`, border: `1px solid ${exam.color}55` }}>{exam.icon}</div>
          <div className="grow">
            <h2 style={{ margin: 0 }}>{exam.name}</h2>
            <div className="dim small">Mains-style questions, rubric scoring, model answers.</div>
          </div>
          <div className="row">
            <select style={{ width: 130 }} value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[2, 3, 4, 6, 8].map((n) => (
                <option key={n} value={n}>{n} questions</option>
              ))}
            </select>
            <button className="btn primary" onClick={generatePaper} disabled={busy}>
              {busy ? <span className="spinner" /> : "✎"} {busy ? "Setting paper…" : "Generate paper"}
            </button>
          </div>
        </div>
      </div>

      {paper ? (
        <div className="mt16">
          {paper.map((q, i) => {
            const words = (answers[i] || "").trim().split(/\s+/).filter(Boolean).length;
            return (
              <div key={i} className="card mb16" style={{ borderLeft: "3px solid var(--ball)" }}>
                <div className="row">
                  <span className="badge info">Q{i + 1}</span>
                  <span className="badge neutral">{q.marks} marks</span>
                  <span className="badge neutral">~{q.wordLimit} words</span>
                  <span className="small muted right">{q.section}</span>
                </div>
                <p style={{ fontWeight: 650, fontSize: 15.5, margin: "10px 0" }}>{q.question}</p>
                {q.hints ? <div className="small dim mb8">💡 {q.hints}</div> : null}
                {results ? (
                  results[i] ? (
                    <div className="mt8">
                      <div className={`badge ${Number(results[i].marksAwarded) / Number(results[i].maxMarks) >= 0.7 ? "success" : Number(results[i].marksAwarded) / Number(results[i].maxMarks) >= 0.4 ? "warn" : "danger"}`}>
                        {results[i].marksAwarded}/{results[i].maxMarks} — {results[i].band}
                      </div>
                      <div className="card pad-sm mt8" style={{ borderLeft: "3px solid var(--red)" }}>
                        <strong className="small" style={{ color: "var(--red)" }}>Examiner&apos;s remarks:</strong>
                        <div className="small dim">{results[i].feedback}</div>
                      </div>
                      <details className="mt8">
                        <summary className="small" style={{ cursor: "pointer", fontWeight: 700, color: "var(--ball)" }}>View model answer</summary>
                        <div className="card pad-sm mt8 small dim" style={{ whiteSpace: "pre-wrap" }}>{results[i].modelAnswer}</div>
                      </details>
                    </div>
                  ) : null
                ) : (
                  <div className="answer-box">
                    <textarea value={answers[i] || ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} placeholder="Write your answer here… (structure: intro → body with examples/data → conclusion)" />
                    <div className={`word-count${q.wordLimit && words > q.wordLimit ? " over" : ""}`}>
                      {words} words {q.wordLimit ? `/ limit ${q.wordLimit}` : ""}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {results ? (
            <div className="card" style={{ borderTop: "3px solid var(--ink)" }}>
              <div className="row">
                <h2 style={{ margin: 0 }}>
                  Total: {totalAwarded}/{totalMax} ({totalMax ? Math.round((totalAwarded / totalMax) * 100) : 0}%)
                </h2>
                <span className="badge right">Board-standard rubric</span>
              </div>
              <div className="bar mt16">
                <div style={{ width: `${totalMax ? (totalAwarded / totalMax) * 100 : 0}%` }} />
              </div>
              <div className="row mt16">
                <button className="btn" onClick={() => { setResults(null); setAnswers({}); }}>
                  Rewrite answers
                </button>
                <button className="btn primary" onClick={generatePaper}>
                  New paper
                </button>
              </div>
            </div>
          ) : (
            <button className="btn accent big grow" onClick={scoreAll} disabled={scoring}>
              {scoring ? <span className="spinner" /> : "✎"} {scoring ? "Rokky is grading (master model)…" : "Submit for AI scoring"}
            </button>
          )}
        </div>
      ) : (
        <div className="card mt16">
          <div className="empty">
            <span className="ico">🖋️</span>
            Generate a mains-style paper for {exam.name} — questions mirror the real descriptive stage&apos;s style, marks and word limits.
          </div>
        </div>
      )}
    </div>
  );
}

export default function DescriptivePage() {
  return (
    <Suspense fallback={<div className="loading-block"><span className="spinner" /> Loading…</div>}>
      <DescriptiveSetup />
    </Suspense>
  );
}
