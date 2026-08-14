import { describe, it, expect } from "vitest";
import { listExams } from "../../lib/content/exams";

/**
 * Knowledge-base integrity: every exam JSON must stay self-consistent.
 * These are the invariants the offline quiz engine, mock planner, mastery
 * weighting and LLM prompt context all depend on.
 */
describe("exam knowledge base integrity", () => {
  const exams = listExams();

  it("has all 15 exams registered", () => {
    expect(exams.length).toBe(15);
  });

  it("every pattern declares a mode", () => {
    for (const e of exams) {
      for (const p of e.patterns) {
        expect(["objective", "mixed", "descriptive", "interview"]).toContain(p.mode);
      }
    }
  });

  it("objective patterns: header questions/marks equal the sum of their sections", () => {
    for (const e of exams) {
      for (const p of e.patterns) {
        if (p.mode !== "objective") continue;
        const sections = p.sections.filter((s) => s.mode !== "descriptive" && s.questions > 0);
        const q = sections.reduce((a, s) => a + s.questions, 0);
        const m = sections.reduce((a, s) => a + s.marks, 0);
        if (q > 0) expect(q, `${e.id} :: ${p.stage} question sum`).toBe(p.questions);
        if (m > 0) expect(m, `${e.id} :: ${p.stage} marks sum`).toBe(p.marks);
      }
    }
  });

  it("mixed patterns carry at least one objective and one descriptive section", () => {
    for (const e of exams) {
      for (const p of e.patterns) {
        if (p.mode !== "mixed") continue;
        expect(p.sections.some((s) => s.mode !== "descriptive" && s.questions > 0), `${e.id} :: ${p.stage}`).toBe(true);
        expect(p.sections.some((s) => s.mode === "descriptive"), `${e.id} :: ${p.stage}`).toBe(true);
      }
    }
  });

  it("negFraction is consistent with the negative-marking string", () => {
    for (const e of exams) {
      for (const p of e.patterns) {
        if (p.negFraction > 0) expect(p.negative.toLowerCase()).not.toContain("none");
        if (p.negFraction === 0 && p.mode !== "descriptive" && p.mode !== "interview") {
          expect(p.negative.toLowerCase()).toContain("none");
        }
      }
    }
  });

  it("every sample is well-formed: correct option count, in-range answer, explanation, known subject", () => {
    for (const e of exams) {
      const subjects = e.syllabus.map((s) => s.subject);
      const n = e.options ?? 4;
      expect(e.samples.length, `${e.id} sample bank`).toBeGreaterThanOrEqual(10);
      for (const s of e.samples) {
        expect(s.o?.length, `${e.id} sample "${s.q.slice(0, 40)}"`).toBe(n);
        expect(s.a, `${e.id} sample "${s.q.slice(0, 40)}"`).toBeGreaterThanOrEqual(0);
        expect(s.a, `${e.id} sample "${s.q.slice(0, 40)}"`).toBeLessThan(n);
        expect(s.x?.length, `${e.id} sample "${s.q.slice(0, 40)}" explanation`).toBeGreaterThan(0);
        expect(subjects).toContain(s.s);
      }
    }
  });

  it("IFSCA Grade A is registered with its 5-option format and full structure", () => {
    const ifsca = exams.find((e) => e.id === "ifsca-grade-a")!;
    expect(ifsca).toBeDefined();
    expect(ifsca.options).toBe(5);
    expect(ifsca.samples.every((s) => s.o?.length === 5)).toBe(true);
    // three stages, negative marking on objective papers
    expect(ifsca.stages.map((s) => s.name)).toEqual(["Phase I", "Phase II", "Interview"]);
    const phase1 = ifsca.patterns.find((p) => p.stage === "Phase I Paper 1 (Common)")!;
    expect(phase1.negFraction).toBeCloseTo(0.25, 3);
    expect(phase1.sections.reduce((a, s) => a + s.questions, 0)).toBe(100);
    // descriptive Phase-2 Paper 1 must be tagged descriptive (not offered as MCQ mock)
    const p2 = ifsca.patterns.find((p) => p.stage === "Phase II Paper 1 (Descriptive English)")!;
    expect(p2.mode).toBe("descriptive");
  });

  it("syllabus subject weights sum to ~1 and topic weights sum to ~1", () => {
    for (const e of exams) {
      const sw = e.syllabus.reduce((a, s) => a + s.weight, 0);
      expect(Math.abs(sw - 1), `${e.id} subject weights`).toBeLessThanOrEqual(0.15);
      for (const s of e.syllabus) {
        const tw = s.topics.reduce((a, t) => a + t.weight, 0);
        expect(Math.abs(tw - 1), `${e.id} :: ${s.subject} topic weights`).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it("known 2025-26 pattern corrections are present", () => {
    const ibps = exams.find((e) => e.id === "ibps-po")!;
    expect(ibps.patterns.find((p) => p.stage.includes("Mains"))!.questions).toBe(155);

    const sbi = exams.find((e) => e.id === "sbi-po")!;
    const pre = Object.fromEntries(sbi.patterns.find((p) => p.stage === "Prelims")!.sections.map((s) => [s.name, s.questions]));
    expect(pre["English Language"]).toBe(40);
    expect(pre["Quantitative Aptitude"]).toBe(30);

    const mppsc = exams.find((e) => e.id === "mppsc")!;
    expect(mppsc.patterns.find((p) => p.stage === "Prelims GS")!.marks).toBe(300);

    const chsl = exams.find((e) => e.id === "ssc-chsl")!;
    expect(chsl.patterns.find((p) => p.stage === "Tier II Session 1")!.questions).toBe(135);
  });
});
