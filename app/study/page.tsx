import Link from "next/link";
import { getDb } from "@/lib/store/db";
import { listExams, getExam } from "@/lib/content/exams";
import { templatePlan } from "@/lib/engine/plan";
import { mutateDb } from "@/lib/store/db";
import SummaryGenerator from "@/components/study/SummaryGenerator";
import PlanView from "@/components/study/PlanView";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const db = getDb();
  const summaries = db.summaries.sort((a, b) => b.createdAt - a.createdAt);
  const plan = db.studyPlan;
  const exam = getExam(plan?.examId || db.profile?.targetExamId || "upsc-cse") || listExams()[0];

  // ensure a plan exists (offline template) so the plan view always renders
  if (!plan) {
    await mutateDb((d) => {
      d.studyPlan = templatePlan(exam, exam.plan.weeks, exam.plan.hoursPerDay);
    });
  }
  const p = plan || templatePlan(exam, exam.plan.weeks, exam.plan.hoursPerDay);

  const exams = listExams();

  return (
    <div>
      <div className="grid cols-2">
        <SummaryGenerator exams={exams} />
        <div className="card">
          <h3>🗂️ Your study library ({summaries.length})</h3>
          {summaries.length === 0 ? (
            <div className="empty">
              <span className="ico">📚</span>
              No study material yet. Pick an exam → topic on the left and Rokky will write you proper notes.
            </div>
          ) : (
            summaries.slice(0, 40).map((s) => (
              <Link key={s.id} href={`/study/${s.id}`} className="topic-row" style={{ color: "inherit" }}>
                <span className="name" style={{ fontWeight: 600 }}>
                  {s.title}
                  <small>
                    {s.subject} • {s.style} • {s.wordCount} words • {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </small>
                </span>
                <span className="bar slim" style={{ width: 70, flexShrink: 0 }}>
                  <span style={{ display: "block", width: `${Math.round(s.readProgress * 100)}%`, height: "100%", borderRadius: 999, background: "var(--grad)" }} />
                </span>
                <span className="small muted">read →</span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="section-head mt24">
        <h2>🗺️ Study plan — {exam.name}</h2>
        <div className="line" />
      </div>
      <PlanView plan={p} examName={exam.name} examId={exam.id} />
    </div>
  );
}
