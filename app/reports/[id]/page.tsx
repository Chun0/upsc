import { notFound } from "next/navigation";
import { getDb } from "@/lib/store/db";
import { getExam } from "@/lib/content/exams";
import MarkdownView from "@/components/markdown/MarkdownView";
import ReportReview from "@/components/reports/ReportReview";
import QuestionReview from "@/components/reports/QuestionReview";
import { RokkyMascot } from "@/components/three/Mascot";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const attempt = db.attempts.find((a) => a.id === id);
  if (!attempt || !attempt.score) notFound();
  const quiz = db.quizzes.find((q) => q.id === attempt.quizId);
  const exam = getExam(attempt.examId);

  const pct = attempt.score.percent;
  const gradeColor = pct >= 70 ? "var(--tick)" : pct >= 40 ? "var(--amber)" : "var(--red)";
  const verdict = pct >= 70 ? "Clear pass" : pct >= 40 ? "Borderline" : "Below the line";

  return (
    <div>
      <div className="card marksheet" style={{ marginBottom: 18 }}>
        <div className="row" style={{ alignItems: "center", gap: 16 }}>
          <RokkyMascot size={54} />
          <div className="grow">
            <div className="eyebrow">
              {exam?.icon} {exam?.name || attempt.examId} · {attempt.kind} ·{" "}
              {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: "clamp(1.5rem,3vw,2rem)" }}>{attempt.title}</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="eyebrow">Obtained</div>
            <div className="count-big" style={{ color: gradeColor }}>
              {attempt.score.obtained}
              <span style={{ fontSize: "0.5em", color: "var(--ink-3)" }}> / {attempt.score.max}</span>
            </div>
            <span className="badge" style={{ background: gradeColor, color: "#fff", border: "none" }}>{verdict} · {pct}%</span>
          </div>
          <div className="no-print">
            <ReportReview attemptId={attempt.id} aiAnalysis={Boolean(attempt.aiAnalysis)} aiError={attempt.aiError} hasMarkdown={Boolean(attempt.reportMarkdown)} />
          </div>
        </div>
        <div className="row mt8" style={{ borderTop: "1px solid var(--hair)", paddingTop: 10 }}>
          <span className="small dim">accuracy {(attempt.score.accuracy * 100).toFixed(1)}%</span>
          <span className="small dim">·</span>
          <span className="small dim">{attempt.score.attempted}/{quiz?.questions.length || 0} attempted</span>
          <span className="small dim">·</span>
          <span className="small dim">{attempt.score.correct} correct / {attempt.score.wrong} wrong / {attempt.score.unattempted} skipped</span>
        </div>
      </div>

      {quiz ? <QuestionReview quiz={quiz} attempt={attempt} /> : null}

      <div className="card reader" style={{ padding: "28px 32px" }}>
        <MarkdownView content={attempt.reportMarkdown || "Report rendering issue."} />
      </div>
    </div>
  );
}
