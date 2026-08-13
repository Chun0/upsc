import Link from "next/link";
import { getDb } from "@/lib/store/db";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const db = getDb();
  const attempts = db.attempts.filter((a) => a.status === "submitted").sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Reports</div>
        <h1>Your marksheet, kept honestly</h1>
        <p className="dim" style={{ maxWidth: 660 }}>
          Every submission gets a predesigned report card — charts built by code, analysis filled by the
          master model. Nothing flattering, nothing hidden.
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="card mt24">
          <div className="empty">
            <span className="ico">📊</span>
            No reports yet. Take a quiz and Rokky will build your first report card.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "6px 0" }}>
          <div className="eyebrow" style={{ padding: "12px 18px 6px", borderBottom: "1px solid var(--hair)" }}>
            Ledger · {attempts.length} entries
          </div>
          {attempts.map((a, i) => (
            <Link key={a.id} href={`/reports/${a.id}`} className="exam-row" style={{ color: "inherit" }}>
              <span className="eyebrow" style={{ minWidth: 26 }}>{String(i + 1).padStart(2, "0")}</span>
              <span className={`badge ${a.kind === "mock" ? "info" : a.kind === "descriptive" ? "warn" : "neutral"}`}>{a.kind}</span>
              <span className="name" style={{ fontWeight: 650, minWidth: 0 }}>
                {a.title}
                <small>
                  {fmtDateTime(a.submittedAt || a.startedAt)} • {a.aiAnalysis ? "AI analysed" : "offline report"}
                </small>
              </span>
              <span className="small muted reg-meta" style={{ whiteSpace: "nowrap" }}>
                {a.score ? `accuracy ${(a.score.accuracy * 100).toFixed(0)}%` : "—"}
              </span>
              <span style={{ textAlign: "right" }}>
                <span className={`badge ${(a.score?.percent || 0) >= 70 ? "success" : (a.score?.percent || 0) >= 40 ? "warn" : "danger"}`}>
                  {a.score ? `${a.score.obtained}/${a.score.max}` : "—"}
                </span>
                <span className="small muted" style={{ display: "block", marginTop: 4 }}>view →</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
