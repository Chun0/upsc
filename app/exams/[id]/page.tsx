import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam } from "@/lib/content/exams";
import { getDb } from "@/lib/store/db";
import SyllabusExplorer from "@/components/exams/SyllabusExplorer";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = getExam(id);
  if (!exam) notFound();
  const db = getDb();
  const now = Date.now();

  const attempts = db.attempts.filter((a) => a.examId === exam.id && a.status === "submitted");

  return (
    <div>
      {/* masthead — the gazette notification */}
      <div className="card" style={{ borderTop: "3px solid var(--ink)" }}>
        <div className="eyebrow">{exam.org} · notification</div>
        <div className="row mt8" style={{ alignItems: "flex-start" }}>
          <div className="exam-ico" style={{ width: 64, height: 64, fontSize: 30, background: `${exam.color}14`, border: `1px solid ${exam.color}55` }}>
            {exam.icon}
          </div>
          <div className="grow">
            <h1 style={{ margin: 0, fontSize: "clamp(1.7rem,4vw,2.4rem)" }}>{exam.name}</h1>
            <div className="dim">{exam.fullName}</div>
            <p className="dim mt8" style={{ maxWidth: 760 }}>{exam.overview}</p>
          </div>
          <div className="row" style={{ alignSelf: "center" }}>
            <Link href={`/practice?exam=${exam.id}`} className="btn primary">Practice Quiz</Link>
            <Link href={`/mocks?exam=${exam.id}`} className="btn accent">Mini Mock</Link>
            <Link href={`/study?exam=${exam.id}`} className="btn">Study</Link>
          </div>
        </div>
        <div className="row mt8" style={{ borderTop: "1px solid var(--hair)", paddingTop: 12 }}>
          <span className="chip">Age: {exam.age}</span>
          <span className="chip">Attempts: {exam.attempts}</span>
          {exam.eligibility.map((e) => (
            <span key={e} className="chip">{e}</span>
          ))}
        </div>
      </div>

      {/* selection process — a genuine sequence, numbered */}
      <div className="section-head">
        <h2>Selection process</h2>
        <div className="line" />
      </div>
      <div className="card" style={{ padding: "20px 20px 8px" }}>
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap", alignItems: "stretch" }}>
          {exam.stages.map((s, i) => (
            <div key={s.name} style={{ flex: "1 1 150px", minWidth: 150, padding: "0 14px 16px 0", position: "relative" }}>
              {i < exam.stages.length - 1 ? (
                <span style={{ position: "absolute", right: 2, top: 15, color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: 14 }}>→</span>
              ) : null}
              <span className="badge" style={{ background: "var(--ink)", color: "#fff", border: "none" }}>Stage {i + 1}</span>
              <h3 className="mt8" style={{ fontSize: 15 }}>{s.name}</h3>
              <div className="small dim">{s.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* patterns */}
      <div className="section-head">
        <h2>Exam patterns (official)</h2>
        <div className="line" />
      </div>
      {exam.patterns.map((p) => (
        <div key={p.stage} className="card mb16">
          <div className="row">
            <h3 style={{ margin: 0 }}>{p.stage}</h3>
            <span className="badge info">{p.questions} Q</span>
            <span className="badge neutral">{p.marks} marks</span>
            <span className="badge neutral">{p.durationMin} min</span>
            <span className={`badge ${p.negFraction > 0 ? "danger" : "success"}`}>{p.negative}</span>
          </div>
          <table className="tbl mt16">
            <thead>
              <tr>
                <th>Section</th>
                <th>Questions</th>
                <th>Marks</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {p.sections.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td className="num">{s.questions}</td>
                  <td className="num">{s.marks}</td>
                  <td className="num">{s.durationMin ? `${s.durationMin} min` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.notes?.length ? (
            <div className="row mt8">
              {p.notes.map((n) => (
                <span key={n} className="chip">ℹ️ {n}</span>
              ))}
            </div>
          ) : null}
        </div>
      ))}

      {/* syllabus */}
      <div className="section-head">
        <h2>Syllabus explorer</h2>
        <div className="line" />
      </div>
      <SyllabusExplorer exam={exam} topicStats={db.topicStats} now={now} />

      {/* trends + sources */}
      <div className="grid cols-2 mt24">
        <div className="card">
          <h3>What&apos;s trending in this exam</h3>
          <ul>
            {exam.trends.map((t) => (
              <li key={t} className="mb8">{t}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Official sources</h3>
          <ul>
            {exam.sources.map((s) => (
              <li key={s} className="mb8">
                <a href={s} target="_blank" rel="noreferrer">{s.replace("https://", "")}</a>
              </li>
            ))}
          </ul>
          <div className="hint mt16">
            Pattern data verified against 2025–26 notifications &amp; exam analyses ({attempts.length} of your attempts analysed for this exam).
          </div>
        </div>
      </div>
    </div>
  );
}
