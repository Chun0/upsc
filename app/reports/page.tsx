import Link from "next/link";
import { getDb } from "@/lib/store/db";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const db = getDb();
  const attempts = db.attempts.filter((a) => a.status === "submitted").sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  return (
    <div>
      <p className="dim" style={{ marginTop: -8 }}>
        Every submission gets a predesigned markdown report card — charts built by code, analysis filled by the master model.
      </p>
      {attempts.length === 0 ? (
        <div className="card mt24">
          <div className="empty">
            <span className="ico">📊</span>
            No reports yet. Take a quiz and Rokky will build your first report card.
          </div>
        </div>
      ) : (
        <div className="card mt16" style={{ padding: 6 }}>
          {attempts.map((a) => (
            <Link key={a.id} href={`/reports/${a.id}`} className="topic-row" style={{ color: "inherit", padding: "13px 12px" }}>
              <span className={`badge ${a.kind === "mock" ? "info" : a.kind === "descriptive" ? "warn" : "neutral"}`}>{a.kind}</span>
              <span className="name" style={{ fontWeight: 650 }}>
                {a.title}
                <small>
                  {fmtDateTime(a.submittedAt || a.startedAt)} • {a.aiAnalysis ? "🤖 AI analysed" : "⚙️ offline report"}
                </small>
              </span>
              <span className={`badge ${(a.score?.percent || 0) >= 70 ? "success" : (a.score?.percent || 0) >= 40 ? "warn" : "danger"}`}>
                {a.score ? `${a.score.obtained}/${a.score.max}` : "—"}
              </span>
              <span className="small muted">view →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
