"use client";

import { useState } from "react";
import type { Quiz, Attempt } from "@/lib/types";

export default function QuestionReview({ quiz, attempt }: { quiz: Quiz; attempt: Attempt }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const correct = (q: Quiz["questions"][number], sel?: string[]) =>
    sel?.length === 1 && q.answerIndex != null && sel[0] === String(q.answerIndex);

  return (
    <details className="card mb16" style={{ padding: "16px 18px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>
        🔍 Review every question ({quiz.questions.length}) — click a question to see the explanation
      </summary>
      <div className="mt16">
        {quiz.questions.map((q, i) => {
          const sel = attempt.answers[q.id]?.selected || [];
          const ok = correct(q, sel);
          return (
            <div key={q.id} className="card pad-sm mb8" style={{ borderColor: sel.length ? (ok ? "rgba(29,122,67,0.4)" : "rgba(179,38,30,0.4)") : undefined, borderLeft: sel.length ? (ok ? "3px solid var(--tick)" : "3px solid var(--red)") : undefined }}>
              <button
                className="row"
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "inherit", fontFamily: "inherit", textAlign: "left" }}
                onClick={() => setOpen((o) => ({ ...o, [q.id]: !o[q.id] }))}
              >
                <span className={`badge ${!sel.length ? "neutral" : ok ? "success" : "danger"}`}>{i + 1}</span>
                <span className="grow" style={{ fontWeight: 600, fontSize: 14 }}>
                  {q.text.length > 130 ? q.text.slice(0, 129) + "…" : q.text}
                </span>
                <span className="small muted">{q.subject}</span>
              </button>
              {open[q.id] ? (
                <div className="mt8 small" style={{ paddingLeft: 8 }}>
                  {q.options?.map((o, oi) => (
                    <div key={oi} className="row" style={{ gap: 8 }}>
                      <span
                        style={{
                          color: q.answerIndex === oi ? "var(--success)" : sel.includes(String(oi)) ? "var(--danger)" : "var(--text-faint)",
                          fontWeight: q.answerIndex === oi ? 800 : 600,
                        }}
                      >
                        {q.answerIndex === oi ? "✓" : sel.includes(String(oi)) ? "✗" : "•"} {String.fromCharCode(65 + oi)})
                      </span>
                      <span>{o}</span>
                    </div>
                  ))}
                  <div className="mt8 dim">
                    <strong>Explanation:</strong> {q.explanation || "—"}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </details>
  );
}
