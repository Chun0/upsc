"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import type { AnswerState, Attempt, Quiz } from "@/lib/types";
import { fmtClock, fmtDuration } from "@/lib/utils";

type QState = "answered" | "marked" | "visited" | "current" | "unseen";

export default function QuizRunner({ quizId }: { quizId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [idx, setIdx] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // resolve quizId -> attempt (creates a fresh one or resumes an in-progress attempt)
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "could not start attempt");
        const { id: aid } = await res.json();
        setAttemptId(aid);
        const res2 = await fetch(`/api/attempts/${aid}`);
        if (!res2.ok) throw new Error("attempt not found");
        const data = await res2.json();
        if (data.attempt.status === "submitted") {
          router.replace(`/reports/${aid}`);
          return;
        }
        setQuiz(data.quiz);
        setAttempt(data.attempt);
        const ids = data.quiz.questions.map((q: { id: string }) => q.id);
        const answered = Object.keys(data.attempt.answers || {});
        let start = 0;
        for (let i = 0; i < ids.length; i++) if (!answered.includes(ids[i])) { start = i; break; }
        setIdx(start);
      } catch (e) {
        toast(String((e as Error).message || e), "error");
        router.replace("/practice");
      } finally {
        setLoading(false);
      }
    })();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(t); if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  // ----- timers -----
  const sections = quiz?.sections || [];
  const hasSectionTimers = sections.length > 1 && sections.every((s) => s.durationMin > 0);
  const question = quiz?.questions[idx];
  const currentSection = useMemo(() => {
    if (!question || !quiz) return null;
    return quiz.sections.find((s) => s.questionIds.includes(question.id)) || null;
  }, [question, quiz]);

  const elapsed = attempt ? Math.max(0, Math.floor((now - attempt.startedAt) / 1000)) : 0;
  const totalSec = quiz?.totalDurationMin ? quiz.totalDurationMin * 60 : 0;
  const remaining = totalSec ? Math.max(0, totalSec - elapsed) : 0;

  // wall-clock per-section timers (persist across navigation within the attempt)
  const sectionClock = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!quiz) return;
    for (const s of quiz.sections) {
      if (s.durationMin > 0 && sectionClock.current[s.name] === undefined) {
        sectionClock.current[s.name] = s.durationMin * 60;
      }
    }
  }, [quiz]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!hasSectionTimers || !currentSection) return;
    const t = setInterval(() => {
      sectionClock.current[currentSection.name] = Math.max(0, (sectionClock.current[currentSection.name] || 0) - 1);
      setTick((x) => x + 1);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSectionTimers, currentSection?.name]);
  const sectionRemaining = useMemo(() => {
    if (!hasSectionTimers || !currentSection) return 0;
    return sectionClock.current[currentSection.name] || 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSectionTimers, currentSection?.name, tick]);

  // ----- persistence -----
  const persist = useCallback(
    (next: Attempt) => {
      setAttempt(next);
      if (!attemptId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/attempts/${attemptId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: next.answers }),
        }).catch(() => undefined);
      }, 500);
    },
    [attemptId]
  );

  const setAnswer = (sel: string[]) => {
    if (!attempt || !question || !quiz) return;
    const prev = attempt.answers[question.id];
    const nowMs = Date.now();
    const a: AnswerState = {
      selected: sel,
      markedForReview: prev?.markedForReview,
      firstSeenAt: prev?.firstSeenAt || nowMs,
      lastChangedAt: nowMs,
      timeSpentMs: (prev?.timeSpentMs || 0) + (nowMs - (prev?.lastChangedAt || prev?.firstSeenAt || nowMs)),
    };
    persist({ ...attempt, answers: { ...attempt.answers, [question.id]: a } });
  };

  const toggleMark = () => {
    if (!attempt || !question) return;
    const prev = attempt.answers[question.id] || {};
    persist({ ...attempt, answers: { ...attempt.answers, [question.id]: { ...prev, markedForReview: !prev.markedForReview } } });
  };

  const clearAnswer = () => {
    if (!attempt || !question) return;
    const prev = attempt.answers[question.id];
    persist({ ...attempt, answers: { ...attempt.answers, [question.id]: { ...prev, selected: [] } } });
  };

  // ----- submit -----
  const submit = async () => {
    if (!attempt || !attemptId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: attempt.answers }) });
      if (!res.ok) throw new Error((await res.json()).error || "submit failed");
      router.replace(`/reports/${attemptId}?fresh=1`);
    } catch (e) {
      toast(String((e as Error).message || e), "error");
      setSubmitting(false);
    }
  };

  // ----- auto-submit on timeout / section lock -----
  useEffect(() => {
    if (!attempt || submitting) return;
    if (totalSec && remaining <= 0) {
      toast("Time's up! Submitting automatically ⏰", "warn");
      submit();
      return;
    }
    if (hasSectionTimers && sectionRemaining <= 0 && currentSection && quiz) {
      const next = quiz.questions.findIndex((q) => !currentSection.questionIds.includes(q.id) && idx < quiz.questions.indexOf(q));
      const target = next >= 0 ? next : idx + 1;
      if (target < quiz.questions.length) {
        toast(`${currentSection.name} time over — moving on ⏰`, "warn");
        setIdx(target);
      }
      // last section expired: stay, timer shows 00:00, user submits manually (no toast spam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, sectionRemaining, submitting]);

  // mark questions as visited the moment they're shown (palette state)
  useEffect(() => {
    if (!attempt || !question || submitting) return;
    const prev = attempt.answers[question.id];
    if (!prev?.firstSeenAt) {
      const nowMs = Date.now();
      persist({
        ...attempt,
        answers: {
          ...attempt.answers,
          [question.id]: { selected: prev?.selected ?? [], markedForReview: prev?.markedForReview, firstSeenAt: nowMs, lastChangedAt: prev?.lastChangedAt, timeSpentMs: prev?.timeSpentMs ?? 0 },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  if (loading) {
    return (
      <div className="loading-block">
        <span className="spinner big" /> Rokky is warming up your quiz…
      </div>
    );
  }
  if (!quiz || !attempt || !question) return null;

  const answered = Object.values(attempt.answers).filter((a) => (a.selected || []).length > 0).length;
  const marked = Object.values(attempt.answers).filter((a) => a.markedForReview).length;
  const q = question;
  const sel = (attempt.answers[q.id]?.selected || []).map(String);
  const markedQ = Boolean(attempt.answers[q.id]?.markedForReview);
  const timerVal = hasSectionTimers && currentSection ? sectionRemaining : remaining;
  const timerCrit = timerVal < 60;
  const timerLow = timerVal < 300;

  const stateOf = (qid: string, qi: number): QState => {
    const a = attempt.answers[qid];
    if (qi === idx) return "current";
    if (a?.markedForReview) return "marked";
    if ((a?.selected || []).length) return "answered";
    if (a?.firstSeenAt) return "visited";
    return "unseen";
  };

  return (
    <div>
      <div className="quiz-head">
        <div className="grow" style={{ minWidth: 180 }}>
          <strong>{quiz.title}</strong>
          <div className="small muted">
            Question {idx + 1}/{quiz.questions.length} • {q.subject} → {q.topic}
          </div>
        </div>
        <span className={`timer ${timerCrit ? "critical" : timerLow ? "low" : ""}`}>
          ⏱️ {hasSectionTimers && currentSection ? `${currentSection.name}: ` : ""}
          {fmtClock(timerVal)}
        </span>
        <div className="row">
          <span className="badge success">{answered} answered</span>
          <span className="badge warn">{marked} marked</span>
        </div>
        <button className="btn primary" onClick={() => setConfirmOpen(true)} disabled={submitting}>
          {submitting ? <span className="spinner" /> : null} {submitting ? "Scoring…" : "Hand in paper"}
        </button>
      </div>

      <div className="split" style={{ gridTemplateColumns: "1fr 260px" }}>
        <div className="card">
          <div className="row mb16">
            <span className="badge info">{q.type}</span>
            <span className="badge neutral">+{q.marks} marks</span>
            {q.negMarks > 0 ? <span className="badge danger">−{q.negMarks} wrong</span> : null}
            <span className="badge neutral">difficulty {q.difficulty}/5</span>
            {markedQ ? <span className="badge warn">marked for review</span> : null}
          </div>
          <div style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.65 }}>{q.text}</div>

          <div className="mt16">
            {q.type === "fill" ? (
              <input value={sel[0] || ""} onChange={(e) => setAnswer(e.target.value ? [e.target.value] : [])} placeholder="Type your answer…" autoFocus />
            ) : (
              (q.options || []).map((opt, oi) => {
                const isSel = sel.includes(String(oi));
                return (
                  <div key={oi} className={`option${isSel ? " sel" : ""}`} onClick={() => (q.type === "mcq-multi" ? setAnswer(isSel ? sel.filter((s) => s !== String(oi)) : [...sel, String(oi)]) : setAnswer([String(oi)]))}>
                    <span className="letter">{String.fromCharCode(65 + oi)}</span>
                    <span style={{ paddingTop: 2 }}>{opt}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="row mt24">
            <button className="btn" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
              ← Prev
            </button>
            <button className="btn ghost" onClick={toggleMark}>
              {markedQ ? "★ Unmark" : "☆ Mark for review"}
            </button>
            <button className="btn ghost" onClick={clearAnswer} disabled={!sel.length}>
              Clear
            </button>
            <button className="btn primary right" onClick={() => (idx < quiz.questions.length - 1 ? setIdx(idx + 1) : setConfirmOpen(true))}>
              {idx < quiz.questions.length - 1 ? "Next →" : "Finish"}
            </button>
          </div>
        </div>

        <div className="side-sticky">
          <div className="card">
            <h3 style={{ fontSize: 14 }}>Question palette</h3>
            <div className="palette">
              {quiz.questions.map((qq, qi) => {
                const st = stateOf(qq.id, qi);
                return (
                  <button key={qq.id} className={st} onClick={() => setIdx(qi)} title={`Q${qi + 1} — ${st}`}>
                    {qi + 1}
                  </button>
                );
              })}
            </div>
            <div className="small muted mt16" style={{ lineHeight: 2 }}>
              <div className="row" style={{ gap: 14 }}>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--tick)", display: "inline-block" }} /> answered
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} /> marked
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.4px solid rgba(32,29,22,0.3)", display: "inline-block" }} /> unseen
                </span>
              </div>
              <div>
                Progress: {fmtDuration(elapsed)} elapsed
                {hasSectionTimers && currentSection ? ` • ${currentSection.name} timer active` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit this attempt?">
        <div className="row mb16">
          <span className="badge success">{answered} answered</span>
          <span className="badge warn">{marked} marked for review</span>
          <span className="badge danger">{quiz.questions.length - answered} unattempted</span>
        </div>
        <p className="dim small">
          Submitting locks the attempt. Rokky will score it, update your topic mastery map and write your report card. Unattempted questions score 0 with no penalty.
        </p>
        <div className="row mt16">
          <button className="btn grow" onClick={() => setConfirmOpen(false)}>
            Keep working
          </button>
          <button className="btn primary grow" onClick={submit} disabled={submitting}>
            {submitting ? <span className="spinner" /> : "🚀"} {submitting ? "Scoring…" : "Submit now"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
