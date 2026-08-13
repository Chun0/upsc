import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam } from "@/lib/content/exams";
import { getDb } from "@/lib/store/db";
import { classifyTopic, readiness } from "@/lib/engine/mastery";
import { topicKey } from "@/lib/engine/mastery";
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
      <div className="card" style={{ background: `linear-gradient(135deg, ${exam.color}18, rgba(11,16,36,0.4))`, borderColor: `${exam.color}44` }}>
        <div className="row">
          <div className="exam-ico" style={{ width: 62, height: 62, fontSize: 30, background: `${exam.color}22`, border: `1px solid ${exam.color}55` }}>
            {exam.icon}
          </div>
          <div className="grow">
            <h1 style={{ fontSize: "1.7rem" }}>{exam.name} — {exam.fullName}</h1>
            <div className="dim">{exam.org}</div>
          </div>
          <div className="row">
            <Link href={`/practice?exam=${exam.id}`} className="btn primary">
              ✍️ Practice Quiz
            </Link>
            <Link href={`/mocks?exam=${exam.id}`} className="btn accent">
              🎯 Mini Mock
            </Link>
            <Link href={`/study?exam=${exam.id}`} className="btn">
              📚 Study
            </Link>
          </div>
        </div>
        <p className="dim mt16">{exam.overview}</p>
        <div className="row mt8">
          <span className="chip">🎂 Age: {exam.age}</span>
          <span className="chip">🎫 Attempts: {exam.attempts}</span>
          {exam.eligibility.map((e) => (
            <span key={e} className="chip">
              ✅ {e}
            </span>
          ))}
        </div>
      </div>

      {/* selection process */}
      <div className="section-head">
        <h2>🧩 Selection process</h2>
        <div className="line" />
      </div>
      <div className="row">
        {exam.stages.map((s, i) => (
          <div key={s.name} className="card pad-sm" style={{ minWidth: 180, flex: 1 }}>
            <span className="badge neutral">Stage {i + 1}</span>
            <h3 className="mt8">{s.name}</h3>
            <div className="small dim">{s.note}</div>
          </div>
        ))}
      </div>

      {/* patterns */}
      <div className="section-head">
        <h2>📐 Exam patterns (official)</h2>
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
                  <td>{s.questions}</td>
                  <td>{s.marks}</td>
                  <td>{s.durationMin ? `${s.durationMin} min` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.notes?.length ? (
            <div className="row mt8">
              {p.notes.map((n) => (
                <span key={n} className="chip">
                  ℹ️ {n}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}

      {/* syllabus */}
      <div className="section-head">
        <h2>📚 Syllabus explorer</h2>
        <div className="line" />
      </div>
      <SyllabusExplorer exam={exam} topicStats={db.topicStats} now={now} />

      {/* trends + samples */}
      <div className="grid cols-2 mt24">
        <div className="card">
          <h3>📈 What&apos;s trending in this exam</h3>
          <ul>
            {exam.trends.map((t) => (
              <li key={t} className="mb8">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>🔗 Official sources</h3>
          <ul>
            {exam.sources.map((s) => (
              <li key={s} className="mb8">
                <a href={s} target="_blank" rel="noreferrer">
                  {s.replace("https://", "")}
                </a>
              </li>
            ))}
          </ul>
          <div className="hint mt16">
            Pattern data verified against 2025–26 notifications & exam analyses ({attempts.length} of your attempts analysed for this exam).
          </div>
        </div>
      </div>
    </div>
  );
}
