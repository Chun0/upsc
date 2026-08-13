"use client";

import { useMemo, useState } from "react";
import type { ExamDef, TopicStat } from "@/lib/types";
import { classifyTopic, topicKey } from "@/lib/engine/mastery";

/** Five-dot bubble meter — PYQ frequency / difficulty as filled OMR bubbles. */
function Dots({ value, max = 5, color = "var(--ball)" }: { value: number; max?: number; color?: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }} aria-label={`${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            border: "1.4px solid rgba(32,29,22,0.3)",
            background: i < value ? color : "transparent",
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

export default function SyllabusExplorer({ exam, topicStats, now }: { exam: ExamDef; topicStats: Record<string, TopicStat>; now: number }) {
  const [openSubject, setOpenSubject] = useState<string | null>(exam.syllabus[0]?.subject || null);

  const rows = useMemo(() => {
    return exam.syllabus.map((s) => ({
      subject: s,
      topics: s.topics.map((t) => {
        const stat = topicStats[topicKey(exam.id, s.subject, t.name)];
        const { verdict, r } = classifyTopic(stat, now);
        return { t, stat, verdict, r };
      }),
    }));
  }, [exam, topicStats, now]);

  return (
    <div>
      {rows.map(({ subject, topics }) => {
        const open = openSubject === subject.subject;
        return (
          <div key={subject.subject} className="card mb16" style={{ padding: "10px 18px" }}>
            <button
              className="row"
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "inherit", fontFamily: "inherit", padding: 4 }}
              onClick={() => setOpenSubject(open ? null : subject.subject)}
            >
              <span style={{ color: "var(--ink-3)", width: 16 }}>{open ? "−" : "+"}</span>
              <span style={{ fontWeight: 800, fontSize: 15.5 }}>{subject.subject}</span>
              <span className="badge neutral">weight {Math.round(subject.weight * 100)}%</span>
              <span className="small muted right">{subject.topics.length} topics</span>
            </button>
            {open ? (
              <div className="mt8">
                {topics.map(({ t, stat, verdict, r }) => (
                  <div key={t.name} className="topic-row syllabus-topic">
                    <span className="name">
                      {t.name}
                      {t.sub?.length ? <small>{t.sub.join(" · ")}</small> : null}
                    </span>
                    <span className="small muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                      PYQ <Dots value={t.pyq} />
                    </span>
                    <span className="small muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                      diff <Dots value={t.difficulty} color="var(--red)" />
                    </span>
                    <span
                      className={`badge ${verdict === "strong" ? "success" : verdict === "weak" ? "danger" : verdict === "developing" ? "warn" : "neutral"}`}
                      style={{ minWidth: 92, justifyContent: "center" }}
                    >
                      {stat?.n ? `${verdict} ${Math.round(r * 100)}%` : "not attempted"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
