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

  return (
    <div>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <RokkyMascot size={52} />
        <div className="grow">
          <div className="small muted">
            {exam?.icon} {exam?.name || attempt.examId} • {attempt.kind} • {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <strong>
            {attempt.score.obtained}/{attempt.score.max} ({attempt.score.percent}%)
          </strong>{" "}
          <span className="small dim">
            • accuracy {(attempt.score.accuracy * 100).toFixed(1)}% • {attempt.score.attempted}/{quiz?.questions.length || 0} attempted
          </span>
        </div>
        <ReportReview attemptId={attempt.id} aiAnalysis={Boolean(attempt.aiAnalysis)} aiError={attempt.aiError} hasMarkdown={Boolean(attempt.reportMarkdown)} />
      </div>

      {quiz ? <QuestionReview quiz={quiz} attempt={attempt} /> : null}

      <div className="card" style={{ padding: "28px 32px" }}>
        <MarkdownView content={attempt.reportMarkdown || "Report rendering issue."} />
      </div>
    </div>
  );
}
