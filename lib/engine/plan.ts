// ============ Study plan: template fallback (offline) ============
import type { ExamDef, StudyPlan } from "../types";

/** Deterministic template-based plan (used when no API key). */
export function templatePlan(exam: ExamDef, weeks?: number, hoursPerDay?: number): StudyPlan {
  const w = weeks || exam.plan.weeks;
  const h = hoursPerDay || exam.plan.hoursPerDay;
  const phases = exam.plan.phases.map((p) => ({ ...p, tasks: [...p.tasks] }));
  const weekly: StudyPlan["weekly"] = [];
  const phaseWeeks = phases.map((p) => p.weeks);
  let week = 1;
  for (let pi = 0; pi < phases.length && week <= w; pi++) {
    const p = phases[pi];
    const span = Math.max(1, Math.round((p.weeks / phaseWeeks.reduce((a, b) => a + b, 0)) * w));
    for (let i = 0; i < span && week <= w; i++, week++) {
      weekly.push({
        week,
        focus: p.focus,
        tasks: p.tasks.slice(0, 4).map((t, ti) => (ti === 0 ? t : `${t} (cont.)`)),
      });
    }
  }
  return { examId: exam.id, weeks: w, hoursPerDay: h, createdAt: Date.now(), phases, weekly };
}
