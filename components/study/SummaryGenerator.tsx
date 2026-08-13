"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import type { ExamDef } from "@/lib/types";

const STYLES = [
  { id: "concise", label: "📝 Concise — revision notes" },
  { id: "detailed", label: "📖 Detailed — full notes" },
  { id: "eli5", label: "🧒 ELI5 — explain like I'm 5" },
];

export default function SummaryGenerator({ exams }: { exams: ExamDef[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [examId, setExamId] = useState("upsc-cse");
  const exam = useMemo(() => exams.find((e) => e.id === examId) || exams[0], [exams, examId]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("detailed");
  const [genning, setGenning] = useState(false);
  const [stream, setStream] = useState("");
  const [title, setTitle] = useState("");

  const topics = useMemo(() => {
    if (subject) return exam.syllabus.find((s) => s.subject === subject)?.topics.map((t) => t.name) || [];
    return exam.syllabus.flatMap((s) => s.topics.map((t) => `${s.subject} → ${t.name}`)).slice(0, 60);
  }, [exam, subject]);

  const generate = async () => {
    if (!topic) {
      toast("Pick a topic first", "warn");
      return;
    }
    setGenning(true);
    setStream("");
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam.id, subject: subject || undefined, topic, style }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error || "generation failed");
      }
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // first line is JSON {title}
        const nl = buf.indexOf("\n");
        if (nl > -1) {
          try {
            const meta = JSON.parse(buf.slice(0, nl));
            if (meta.title) setTitle(meta.title);
          } catch {
            /* not json yet */
          }
          setStream(buf.slice(nl + 1));
        } else {
          setStream(buf);
        }
      }
      const markdown = stream || buf.slice(buf.indexOf("\n") + 1);
      const save = await fetch("/api/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam.id, subject: subject || "General", topic, title: title || topic, markdown, style }),
      });
      if (!save.ok) throw new Error("could not save summary");
      const { id } = await save.json();
      toast("Notes saved to your library! 📚", "success");
      router.push(`/study/${id}`);
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setGenning(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ fontFamily: "var(--font-display)" }}>Rokky writes your notes</h3>
      <div className="field mt8">
        <label className="fld">Exam</label>
        <select value={examId} onChange={(e) => { setExamId(e.target.value); setSubject(""); setTopic(""); }}>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.icon} {e.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="fld">Subject (optional)</label>
        <select value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); }}>
          <option value="">All subjects</option>
          {exam.syllabus.map((s) => (
            <option key={s.subject} value={s.subject}>
              {s.subject}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="fld">Topic</label>
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">Choose a topic…</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="fld">Style</label>
        <div className="row">
          {STYLES.map((s) => (
            <button key={s.id} className={`chip${style === s.id ? " on" : ""}`} onClick={() => setStyle(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <button className="btn primary grow" onClick={generate} disabled={genning || !topic}>
        {genning ? <span className="spinner" /> : "✎"} {genning ? "Rokky is writing…" : "Write my notes"}
      </button>
      <div className="hint mt8">Slave model drafts the outline, master model writes the full notes — two agents, one queue.</div>
      {genning && stream ? (
        <div className="card mt16" style={{ maxHeight: 200, overflow: "hidden", opacity: 0.75 }}>
          <div className="small dim" style={{ whiteSpace: "pre-wrap" }}>
            {stream.slice(0, 900)}…
          </div>
        </div>
      ) : null}
    </div>
  );
}
