"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { listExams } from "@/lib/content/exams";
import { fmtDate } from "@/lib/utils";

interface Card {
  id: string;
  examId: string;
  subject: string;
  topic: string;
  front: string;
  back: string;
  dueAt: number;
  intervalDays: number;
  ease: number;
  lapses: number;
}

export default function RevisionPage() {
  const { toast } = useToast();
  const exams = useMemo(() => listExams(), []);
  const [examId, setExamId] = useState("upsc-cse");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [genning, setGenning] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/flashcards?examId=${examId}`)
      .then((r) => r.json())
      .then((d) => setCards(d.cards || []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(load, [load]);

  const now = Date.now();
  const due = cards.filter((c) => c.dueAt <= now);
  const card = due[0];
  const total = cards.length;

  const review = async (rating: "again" | "good" | "easy") => {
    if (!card) return;
    setFlipped(false);
    await fetch("/api/revision/due", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, rating }),
    }).catch(() => undefined);
    load();
  };

  const generateFromWrong = async () => {
    setGenning(true);
    try {
      // collect wrong answers from recent attempts for this exam
      const res = await fetch(`/api/analytics?examId=${examId}`);
      const db = await res.json();
      const quizMap = new Map<string, { questions: { id: string; answerIndex?: number; options?: string[]; text: string }[] }>((db.quizzes || []).map((q: { id: string; questions: { id: string; answerIndex?: number; options?: string[]; text: string }[] }) => [q.id, q]));
      const wrongPairs: { q: string; a: string }[] = [];
      for (const a of (db.attempts || []) as { examId: string; status: string; quizId: string; answers?: Record<string, { selected?: string[] }> }[]) {
        if (a.examId !== examId || a.status !== "submitted") continue;
        const quiz = quizMap.get(a.quizId);
        if (!quiz) continue;
        for (const q of quiz.questions || []) {
          const sel = (a.answers?.[q.id]?.selected || []).filter(Boolean);
          if (!sel.length) continue;
          const ok = sel.length === 1 && q.answerIndex != null && sel[0] === String(q.answerIndex);
          if (!ok && q.answerIndex != null && q.options?.length) {
            wrongPairs.push({ q: q.text.slice(0, 200), a: q.options[q.answerIndex] });
          }
        }
      }
      const gen = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "flashcards", payload: { examId, count: Math.min(10, wrongPairs.length || 8), wrongPairs: wrongPairs.slice(0, 8) } }),
      });
      if (!gen.ok) throw new Error((await gen.json()).error || "generation failed");
      const data = await gen.json();
      const save = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, subject: "Weak topics", cards: data.cards }),
      });
      if (!save.ok) throw new Error("save failed");
      toast(`${data.cards?.length || 0} cards created from your wrong answers! 🧠`, "success");
      load();
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setGenning(false);
    }
  };

  return (
    <div className="split">
      <div className="side-sticky">
        <div className="card">
          <h3>🧠 Spaced repetition</h3>
          <div className="field mt8">
            <label className="fld">Exam</label>
            <select value={examId} onChange={(e) => setExamId(e.target.value)}>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.icon} {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="pattern-row">
            <span className="k">Due now</span>
            <span className="v">{due.length}</span>
          </div>
          <div className="pattern-row">
            <span className="k">Total cards</span>
            <span className="v">{total}</span>
          </div>
          <button className="btn primary grow mt8" onClick={generateFromWrong} disabled={genning}>
            {genning ? <span className="spinner" /> : "✨"} {genning ? "Generating…" : "Cards from my wrong answers"}
          </button>
          <div className="hint mt8">SM-2-lite scheduling: intervals grow when you remember, reset when you lapse.</div>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="loading-block">
            <span className="spinner big" /> Loading deck…
          </div>
        ) : !card ? (
          <div className="card">
            <div className="empty">
              <span className="ico">🎉</span>
              {total === 0 ? "No cards yet — generate some from your wrong answers!" : "Deck clear for now. Rokky is proud. Next reviews appear when due."}
            </div>
          </div>
        ) : (
          <div>
            <div className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setFlipped(!flipped)}>
              <div className={`flip${flipped ? " flipped" : ""}`}>
                <div className="flip-inner">
                  <div className="flip-face">
                    <div>
                      <div className="row" style={{ justifyContent: "center", gap: 8 }}>
                        <span className="badge info">{card.subject}</span>
                        <span className="badge neutral">{card.topic}</span>
                      </div>
                      <div style={{ fontSize: 19, marginTop: 18 }}>{card.front}</div>
                      <div className="small muted mt16">tap to flip ↻</div>
                    </div>
                  </div>
                  <div className="flip-face flip-back">
                    <div>
                      <div className="small muted mb8">ANSWER</div>
                      <div style={{ fontSize: 16.5, lineHeight: 1.7 }}>{card.back}</div>
                      <div className="small muted mt16">
                        {card.lapses > 0 ? `${card.lapses} lapses • ` : ""}interval {card.intervalDays}d • ease {card.ease.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mt16" style={{ justifyContent: "center" }}>
              <button className="btn danger big" onClick={() => review("again")}>
                🔁 Again (10 min)
              </button>
              <button className="btn big" onClick={() => review("good")}>
                🙂 Good
              </button>
              <button className="btn success big" style={{ borderColor: "rgba(52,211,153,0.5)", color: "var(--success)", background: "rgba(52,211,153,0.08)" }} onClick={() => review("easy")}>
                🚀 Easy
              </button>
            </div>
            <div className="hint mt8 center">{due.length - 1} more due after this one.</div>
          </div>
        )}
      </div>
    </div>
  );
}
