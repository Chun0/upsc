import Link from "next/link";
import { listExams } from "@/lib/content/exams";
import { getDb } from "@/lib/store/db";
import { examReadiness } from "@/lib/engine/mastery";
import Tilt from "@/components/ui/Tilt";

export const dynamic = "force-dynamic";

export default function ExamsPage() {
  const exams = listExams();
  const db = getDb();
  const now = Date.now();

  return (
    <div>
      <p className="dim" style={{ marginTop: -8 }}>
        {exams.length} exams mapped with official patterns, syllabus weights, PYQ trends and sample questions. Pick one to explore — every exam here knows its own structure.
      </p>
      <div className="grid cols-3 mt24">
        {exams.map((e) => {
          const readiness = Math.round(examReadiness(db.topicStats, e, now) * 100);
          const attempts = db.attempts.filter((a) => a.examId === e.id && a.status === "submitted").length;
          return (
            <Link key={e.id} href={`/exams/${e.id}`} style={{ display: "block" }}>
              <Tilt className="card exam-card hoverable">
                <div className="top">
                  <div className="exam-ico" style={{ background: `${e.color}22`, border: `1px solid ${e.color}55` }}>
                    {e.icon}
                  </div>
                  <div>
                    <div className="name">{e.name}</div>
                    <div className="org">{e.org}</div>
                  </div>
                  <span className="badge neutral right">{e.stages.length} stages</span>
                </div>
                <div className="small dim" style={{ minHeight: 42 }}>
                  {e.tagline}
                </div>
                <div className="pattern-row">
                  <span className="k">First stage</span>
                  <span className="v">
                    {e.patterns[0]?.questions} Q • {e.patterns[0]?.durationMin} min
                  </span>
                </div>
                <div className="pattern-row">
                  <span className="k">Negative marking</span>
                  <span className="v">{e.patterns[0]?.negative}</span>
                </div>
                <div className="pattern-row">
                  <span className="k">Your readiness</span>
                  <span className="v" style={{ color: readiness >= 70 ? "var(--success)" : readiness >= 40 ? "var(--warn)" : "var(--text-faint)" }}>
                    {attempts > 0 ? `${readiness}%` : "—"}
                  </span>
                </div>
                <div className="mt8 row">
                  <span className="small muted">{attempts} attempts</span>
                  <span className="small muted right">Explore →</span>
                </div>
              </Tilt>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
