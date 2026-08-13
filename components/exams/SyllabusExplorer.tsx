"use client";

import { useMemo, useState } from "react";
import type { ExamDef, TopicStat } from "@/lib/types";
import { classifyTopic, topicKey } from "@/lib/engine/mastery";

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
          <div key={subject.subject} className="card mb16" style={{ padding: "12px 18px" }}>
            <button
              className="row"
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "inherit", fontFamily: "inherit", padding: 4 }}
              onClick={() => setOpenSubject(open ? null : subject.subject)}
            >
              <span style={{ fontSize: 18 }}>{open ? "▾" : "▸"}</span>
              <span style={{ fontWeight: 800, fontSize: 15.5 }}>{subject.subject}</span>
              <span className="badge neutral">weight {Math.round(subject.weight * 100)}%</span>
              <span className="small muted right">{subject.topics.length} topics</span>
            </button>
            {open ? (
              <div className="mt8">
                {topics.map(({ t, stat, verdict, r }) => (
                  <div key={t.name} className="topic-row">
                    <span className="name">
                      {t.name}
                      {t.sub?.length ? <small>{t.sub.join(" · ")}</small> : null}
                    </span>
                    <span className="chip" title="PYQ frequency (1-5)">
                      🔁 {t.pyq}/5
                    </span>
                    <span className="chip" title="Difficulty (1-5)">
                      ⚡ {t.difficulty}/5
                    </span>
                    <span
                      className={`badge ${verdict === "strong" ? "success" : verdict === "weak" ? "danger" : verdict === "developing" ? "warn" : "neutral"}`}
                      style={{ minWidth: 86, justifyContent: "center" }}
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
