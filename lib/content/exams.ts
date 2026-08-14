// ============ Exam registry: static imports of content/exams/*.json ============
// Static imports (not fs) so the registry works in client components, RSC and tests alike.
import type { ExamDef, PatternDef, SubjectDef, TopicDef } from "../types";
import upscCse from "../../content/exams/upsc-cse.json";
import sscCgl from "../../content/exams/ssc-cgl.json";
import sscChsl from "../../content/exams/ssc-chsl.json";
import ibpsPo from "../../content/exams/ibps-po.json";
import sbiPo from "../../content/exams/sbi-po.json";
import rbiGradeB from "../../content/exams/rbi-grade-b.json";
import nda from "../../content/exams/nda.json";
import cds from "../../content/exams/cds.json";
import afcat from "../../content/exams/afcat.json";
import rrbNtpc from "../../content/exams/rrb-ntpc.json";
import rrbGroupD from "../../content/exams/rrb-group-d.json";
import mppsc from "../../content/exams/mppsc.json";
import ugcNet from "../../content/exams/ugc-net.json";
import ctet from "../../content/exams/ctet.json";
import ifscaGradeA from "../../content/exams/ifsca-grade-a.json";

const ALL: ExamDef[] = [
  upscCse, sscCgl, sscChsl, ibpsPo, sbiPo, rbiGradeB, nda, cds, afcat,
  rrbNtpc, rrbGroupD, mppsc, ugcNet, ctet, ifscaGradeA,
].map((e) => e as unknown as ExamDef);

let cache: ExamDef[] | null = null;

export function listExams(): ExamDef[] {
  if (!cache) cache = [...ALL].sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

export function getExam(id: string): ExamDef | undefined {
  return listExams().find((e) => e.id === id);
}

export function allTopics(exam: ExamDef): { subject: SubjectDef; topic: TopicDef }[] {
  const out: { subject: SubjectDef; topic: TopicDef }[] = [];
  for (const s of exam.syllabus) for (const t of s.topics) out.push({ subject: s, topic: t });
  return out;
}

export function patternFor(exam: ExamDef, stageName?: string): PatternDef | undefined {
  if (stageName) return exam.patterns.find((p) => p.stage === stageName);
  return exam.patterns[0];
}

export function totalTopicWeight(exam: ExamDef): number {
  return exam.syllabus.reduce((acc, s) => acc + s.weight, 0);
}

/** Subject-level readiness weight for analytics: subject.weight / total. */
export function normalizedSubjectWeight(exam: ExamDef, subject: SubjectDef): number {
  const total = totalTopicWeight(exam);
  return total > 0 ? subject.weight / total : 0;
}

/** Builds the compact textual exam context injected into every LLM prompt. */
export function examContextText(exam: ExamDef, maxTopicsPerSubject = 8): string {
  const lines: string[] = [];
  lines.push(`EXAM: ${exam.name} (${exam.fullName}) — conducted by ${exam.org}`);
  lines.push(`OVERVIEW: ${exam.overview}`);
  lines.push("STAGES: " + exam.stages.map((s) => `${s.name} (${s.mode}${s.note ? " — " + s.note : ""})`).join(" | "));
  lines.push("PATTERN:");
  for (const p of exam.patterns) {
    lines.push(
      `- ${p.stage}: ${p.questions} questions, ${p.marks} marks, ${p.durationMin} min, negative marking: ${p.negative}` +
        (p.sections.length ? " | Sections: " + p.sections.map((s) => `${s.name} (${s.questions}Q/${s.marks}m${s.durationMin ? "/" + s.durationMin + "min" : ""})`).join(", ") : "")
    );
    if (p.notes?.length) lines.push(`  Notes: ${p.notes.join("; ")}`);
  }
  lines.push("SYLLABUS (subject weight 0-1; each topic tagged with PYQ frequency 1-5 and difficulty 1-5):");
  for (const s of exam.syllabus) {
    const topics = s.topics.slice(0, maxTopicsPerSubject).map((t) => `${t.name} [pyq:${t.pyq}/5, diff:${t.difficulty}/5${t.sub?.length ? " (" + t.sub.join(", ") + ")" : ""}]`);
    lines.push(`- ${s.subject} (weight ${Math.round(s.weight * 100)}%): ${topics.join("; ")}`);
  }
  lines.push("RECENT TRENDS: " + exam.trends.join(" | "));
  return lines.join("\n");
}
