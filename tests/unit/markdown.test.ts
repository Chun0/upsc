// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { preprocessCallouts, PURIFY_CONFIG } from "../../lib/markdown";
import { buildReportMarkdown } from "../../lib/report/template";
import { donutChart, barChart, radarChart, sparkline, progressRing } from "../../lib/report/charts";

describe("preprocessCallouts", () => {
  it("converts ::: blocks to divs", () => {
    const md = "before\n:::success\ngood stuff\n:::\nafter\n:::danger\nbad\n:::\nend";
    const out = preprocessCallouts(md);
    expect(out).toContain('<div class="callout success">');
    expect(out).toContain("good stuff");
    expect(out).toContain('</div>');
    expect(out).toContain("before");
    expect(out).toContain("end");
  });
  it("maps warning/error aliases", () => {
    const out = preprocessCallouts(":::warning\nx\n:::");
    expect(out).toContain("callout warn");
  });
  it("handles unclosed callouts", () => {
    const out = preprocessCallouts(":::info\nnever closed");
    expect(out).toContain("callout info");
    expect(out).toContain("</div>");
  });
});

describe("marked rendering", () => {
  it("renders gfm tables and links", () => {
    marked.setOptions({ gfm: true, breaks: false });
    const html = marked.parse("| A | B |\n|---|---|\n| 1 | 2 |\n\n[link](https://x.dev)") as string;
    expect(html).toContain("<table>");
    expect(html).toContain("https://x.dev");
  });
  it("renders html blocks from charts", () => {
    const html = marked.parse(`<div class="chart-row">${donutChart([{ label: "A", value: 1, color: "#fff" }], 100, 10)}</div>`) as string;
    expect(html).toContain("<svg");
  });
});

describe("DOMPurify sanitization", () => {
  it("strips scripts and event handlers", () => {
    const dirty = `<p onclick="alert(1)">hi</p><script>alert(2)</script><img src=x onerror=alert(3)>`;
    const clean = DOMPurify.sanitize(dirty, PURIFY_CONFIG as never);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onerror");
  });
  it("keeps our SVG charts", () => {
    const svg = donutChart([{ label: "Correct", value: 4, color: "#34d399" }], 120, 20, "80%", "score");
    const clean = DOMPurify.sanitize(`<div>${svg}</div>`, PURIFY_CONFIG as never);
    expect(clean).toContain("<svg");
    expect(clean).toContain("<circle");
    expect(clean).toContain("stroke-dasharray");
  });
  it("sanitizes a full generated report without losing structure", () => {
    const attempt = {
      id: "a1", quizId: "q1", examId: "ssc-cgl", title: "T", kind: "practice" as const,
      status: "submitted" as const, startedAt: Date.now() - 60000, submittedAt: Date.now(), answers: {},
      score: { obtained: 8, max: 12, attempted: 5, correct: 4, wrong: 1, unattempted: 1, accuracy: 0.8, percent: 66.7, guessAudit: { guessed: 1, guessedCorrect: 0, guessedWrong: 1 }, perSection: [{ name: "S", questions: 6, attempted: 5, correct: 4, wrong: 1, unattempted: 1, obtained: 8, max: 12, accuracy: 0.8 }], perTopic: [{ subject: "M", topic: "P", attempted: 5, correct: 4, wrong: 1, unattempted: 1, obtained: 8, max: 12 }], timeSpentSec: 40 },
      reportMarkdown: "", aiAnalysis: false,
    };
    const quiz = { id: "q1", title: "T", examId: "ssc-cgl", kind: "practice" as const, difficulty: 2, subjects: [], topics: [], sections: [], totalDurationMin: 5, createdAt: 1, source: "ai" as const, questions: [] };
    const md = buildReportMarkdown({ attempt, quiz, score: attempt.score, ai: { verdict: "v", overview: "o<script>x</script>", sectionInsights: [], strengths: [], weaknesses: [], topicBreakdown: [], actionPlan: [], realityCheck: "r", motivation: "m" } });
    const raw = marked.parse(preprocessCallouts(md)) as string;
    const clean = DOMPurify.sanitize(raw, PURIFY_CONFIG as never);
    expect(clean).toContain("Score Card");
    expect(clean).not.toContain("<script");
    expect(clean).toContain("svg");
  });
});

describe("chart builders", () => {
  it("donut includes segments and center label", () => {
    const s = donutChart([{ label: "a", value: 3, color: "#111" }, { label: "b", value: 1, color: "#222" }], 140, 20, "75%", "sub");
    expect(s).toContain("<svg");
    expect(s.split("<circle").length - 1).toBeGreaterThanOrEqual(2);
    expect(s).toContain("75%");
  });
  it("barChart handles negatives and truncates long labels", () => {
    const s = barChart([{ label: "very long section name that needs truncation", value: -2, max: 10, display: "-2" }], 400, 20, 10);
    expect(s).toContain("<svg");
    expect(s).toContain("…");
  });
  it("radarChart draws polygons for N axes", () => {
    const s = radarChart([{ label: "A", value: 0.5 }, { label: "B", value: 0.8 }, { label: "C", value: 0.2 }], 260);
    expect((s.match(/<polygon/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(s).toContain("A");
  });
  it("sparkline and progressRing render", () => {
    expect(sparkline([1, 2, 3], 100, 30)).toContain("polyline");
    expect(sparkline([], 100, 30)).toBe("");
    expect(progressRing(0.5, 100)).toContain("50%");
    expect(progressRing(1.4, 100)).toContain("100%");
  });
});
