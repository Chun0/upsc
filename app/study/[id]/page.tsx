import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/store/db";
import MarkdownView from "@/components/markdown/MarkdownView";
import ReaderActions from "@/components/study/ReaderActions";

export const dynamic = "force-dynamic";

export default async function StudyDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const doc = db.summaries.find((s) => s.id === id);
  if (!doc) notFound();

  return (
    <div className="split" style={{ gridTemplateColumns: "1fr 240px" }}>
      <div className="card reader" style={{ padding: "28px 32px 24px" }}>
        <div className="row mb16" style={{ borderBottom: "1px solid var(--hair)", paddingBottom: 12 }}>
          <span className="badge info">{doc.subject}</span>
          <span className="badge neutral">{doc.style}</span>
          <span className="badge neutral">{doc.wordCount} words</span>
          {doc.timesRead > 0 ? <span className="badge success">read {doc.timesRead}×</span> : null}
          <span className="small muted right">{new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        <MarkdownView content={doc.markdown} />
        <div className="divider" />
        <ReaderActions docId={doc.id} examId={doc.examId} topic={doc.topic} />
      </div>
      <div className="side-sticky">
        <div className="card">
          <h3 style={{ fontSize: 14 }}>Actions</h3>
          <Link href={`/practice?exam=${doc.examId}&topic=${encodeURIComponent(doc.topic)}`} className="btn primary block small">
            Quiz me on this
          </Link>
          <Link href={`/mocks?exam=${doc.examId}`} className="btn block small mt8">
            Mock on {doc.examId}
          </Link>
          <button className="btn block small mt8 no-print" onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14 }}>Reading progress</h3>
          <div className="bar mt8">
            <div style={{ width: `${Math.round(doc.readProgress * 100)}%` }} />
          </div>
          <div className="hint mt8">Scroll to the end and it logs as read — then drill it with a quiz.</div>
        </div>
      </div>
    </div>
  );
}
