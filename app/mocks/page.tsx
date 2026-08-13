"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listExams, getExam } from "@/lib/content/exams";
import { miniMockPlan } from "@/lib/engine/quiz";
import { useToast } from "@/components/ui/Toast";
import type { ExamDef } from "@/lib/types";

function MockBuilder() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const exams = useMemo(() => listExams(), []);
  const [examId, setExamId] = useState(sp.get("exam") || "upsc-cse");
  const exam: ExamDef = getExam(examId) || exams[0];
  const [stage, setStage] = useState("");
  const [scale, setScale] = useState(25);
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setHasKey(Boolean(d.hasKeys)))
      .catch(() => undefined);
  }, []);

  const meritStages = useMemo(() => exam.patterns.filter((p) => p.questions > 0 && !/qualify/i.test(p.stage) || p.questions > 0 && exam.patterns.length <= 1), [exam]);
  const effectiveStage = stage || meritStages[0]?.stage || exam.patterns[0]?.stage;
  const plan = miniMockPlan(exam, effectiveStage, scale);

  const build = async (offline: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam.id, stage: effectiveStage, maxQuestions: scale, offline }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "mock build failed");
      const data = await res.json();
      router.push(`/quiz/${data.id}`);
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="split">
      <div className="side-sticky">
        <div className="card">
          <h3>🎯 Mini mock builder</h3>
          <div className="field mt8">
            <label className="fld">Exam</label>
            <select value={examId} onChange={(e) => { setExamId(e.target.value); setStage(""); }}>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.icon} {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="fld">Stage / paper</label>
            <select value={effectiveStage} onChange={(e) => setStage(e.target.value)}>
              {exam.patterns.map((p) => (
                <option key={p.stage} value={p.stage}>
                  {p.stage}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="fld">Scale: {plan.sections.reduce((a, s) => a + s.questions, 0)} questions ({plan.totalDurationMin} min)</label>
            <input type="range" min={15} max={50} step={5} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
            <div className="hint">Mini mocks scale the real pattern proportionally — section weights and negative marking stay authentic.</div>
          </div>
          <button className="btn primary grow" onClick={() => build(false)} disabled={busy || !hasKey}>
            {busy ? <span className="spinner" /> : "🤖"} {busy ? "Rokky is setting the paper…" : "Generate AI mock"}
          </button>
          <button className="btn grow mt8" onClick={() => build(true)} disabled={busy}>
            📦 Offline mock (samples)
          </button>
        </div>
      </div>

      <div>
        <div className="card">
          <div className="row">
            <div className="exam-ico" style={{ background: `${exam.color}22`, border: `1px solid ${exam.color}55` }}>{exam.icon}</div>
            <div>
              <h2 style={{ margin: 0 }}>{effectiveStage} — scaled to mini mock</h2>
              <div className="dim small">Pattern-authentic: sections, marks, negative marking and per-section timers</div>
            </div>
          </div>
          <table className="tbl mt16">
            <thead>
              <tr><th>Section</th><th>Questions</th><th>Marks</th><th>Time</th><th>Negative</th></tr>
            </thead>
            <tbody>
              {plan.sections.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>{s.questions}</td>
                  <td>{s.marks}</td>
                  <td>{s.durationMin} min</td>
                  <td>{s.negFraction > 0 ? `−${Math.round(s.negFraction * 100)}% of marks` : "none"}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>{plan.sections.reduce((a, s) => a + s.questions, 0)}</strong></td>
                <td><strong>{plan.totalMarks}</strong></td>
                <td><strong>{plan.totalDurationMin} min</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div className="hint mt8">
            Real pattern: {exam.patterns.find((p) => p.stage === effectiveStage)?.questions || "—"} questions / {exam.patterns.find((p) => p.stage === effectiveStage)?.marks || "—"} marks / {exam.patterns.find((p) => p.stage === effectiveStage)?.durationMin || "—"} min.
            {exam.patterns.find((p) => p.stage === effectiveStage)?.notes?.length ? ` Notes: ${exam.patterns.find((p) => p.stage === effectiveStage)!.notes!.join(" • ")}` : ""}
          </div>
        </div>
        <div className="card mt16">
          <h3>🧠 Why mini mocks?</h3>
          <p className="small dim">
            Generating a full 100-question paper in one AI call is unreliable and slow. UDAAN scales the official pattern to {scale} questions with authentic section proportions, timers and negative marking — the report card still analyses sections, topics and guessing behaviour exactly like a full mock.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MocksPage() {
  return (
    <Suspense fallback={<div className="loading-block"><span className="spinner" /> Loading…</div>}>
      <MockBuilder />
    </Suspense>
  );
}
