import Link from "next/link";
import { listExams } from "@/lib/content/exams";
import { getDb } from "@/lib/store/db";
import { examReadiness } from "@/lib/engine/mastery";

export const dynamic = "force-dynamic";

const FAMILY: Record<string, string> = {
  "upsc-cse": "Civil Services",
  "mppsc": "Civil Services",
  "ssc-cgl": "Staff Selection (SSC)",
  "ssc-chsl": "Staff Selection (SSC)",
  "ibps-po": "Banking",
  "sbi-po": "Banking",
  "rbi-grade-b": "Banking",
  "nda": "Defence",
  "cds": "Defence",
  "afcat": "Defence",
  "rrb-ntpc": "Railways",
  "rrb-group-d": "Railways",
  "ugc-net": "Academics",
  "ctet": "Academics",
};

export default function ExamsPage() {
  const exams = listExams();
  const db = getDb();
  const now = Date.now();

  const groups = exams.reduce<Record<string, typeof exams>>((acc, e) => {
    const fam = FAMILY[e.id] || "Other";
    (acc[fam] ||= []).push(e);
    return acc;
  }, {});
  const order = Object.keys(groups);

  let serial = 0;

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Exams</div>
        <h1>The examination register</h1>
        <p className="dim" style={{ maxWidth: 720 }}>
          {exams.length} exams mapped with official patterns, syllabus weights, PYQ trends and sample questions.
          Every exam here knows its own structure — pick yours from the register.
        </p>
      </div>

      {order.map((fam) => (
        <div key={fam}>
          <div className="section-head">
            <h2>{fam}</h2>
            <div className="line" />
            <span className="eyebrow">{groups[fam].length} exams</span>
          </div>
          <div className="card" style={{ padding: "6px 0" }}>
            {groups[fam].map((e) => {
              serial += 1;
              const readiness = Math.round(examReadiness(db.topicStats, e, now) * 100);
              const attempts = db.attempts.filter((a) => a.examId === e.id && a.status === "submitted").length;
              const p0 = e.patterns[0];
              return (
                <Link key={e.id} href={`/exams/${e.id}`} className="exam-row">
                  <span className="eyebrow" style={{ minWidth: 26 }}>{String(serial).padStart(2, "0")}</span>
                  <span className="exam-ico" style={{ borderColor: `${e.color}55`, background: `${e.color}14` }}>{e.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="name" style={{ display: "block" }}>{e.name}</span>
                    <span className="org">{e.org}</span>
                    <span className="small dim" style={{ display: "block" }}>{e.tagline}</span>
                  </span>
                  <span className="small dim reg-meta" style={{ whiteSpace: "nowrap" }}>
                    {p0?.questions} Q · {p0?.durationMin} min
                    <br />
                    <span className={p0?.negFraction ? "" : "muted"}>neg. {p0?.negative}</span>
                  </span>
                  <span style={{ textAlign: "right" }}>
                    <span className={`badge ${attempts > 0 ? (readiness >= 70 ? "success" : readiness >= 40 ? "warn" : "danger") : "neutral"}`}>
                      {attempts > 0 ? `${readiness}% ready` : "not attempted"}
                    </span>
                    <span className="small muted" style={{ display: "block", marginTop: 4 }}>{attempts} attempts · open →</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
