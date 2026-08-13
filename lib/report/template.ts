// ============ Predesigned markdown report card — LLM fills data, charts are built here ============
import type { Attempt, Quiz, ReportData, ScoreSummary, ExamDef } from "../types";
import { fmtDate, fmtDuration, pct, round2 } from "../utils";
import { barChart, donutChart, miniStat, progressRing, radarChart } from "./charts";

const VERDICT_COLORS: Record<string, string> = {
  strong: "#34d399",
  ok: "#fbbf24",
  weak: "#fb7185",
  untouched: "#94a3b8",
  developing: "#fbbf24",
};

function callout(type: "success" | "warn" | "danger" | "info", title: string, body: string): string {
  const color = { success: "#34d399", warn: "#fbbf24", danger: "#fb7185", info: "#38bdf8" }[type];
  return `<div class="callout ${type}" style="border-left:4px solid ${color}">
<div class="callout-title" style="color:${color}">${title}</div>
${body}
</div>`;
}

export function buildReportMarkdown(opts: {
  attempt: Attempt;
  quiz: Quiz;
  exam?: ExamDef;
  score: ScoreSummary;
  ai?: ReportData | null;
}): string {
  const { attempt, quiz, exam, score, ai } = opts;
  const lines: string[] = [];
  const modeLabel = quiz.kind === "mock" ? "🎯 Mini Mock" : quiz.kind === "descriptive" ? "🖋️ Descriptive" : "✍️ Practice Quiz";

  lines.push(`# ${quiz.title}`);
  lines.push(`> ${modeLabel} • ${exam ? exam.name : attempt.examId} • ${fmtDate(attempt.submittedAt || attempt.startedAt)} • ${fmtDuration(score.timeSpentSec)} • difficulty ${quiz.difficulty}/5`);
  lines.push("");

  // ---- Score card ----
  lines.push("## Score Card");
  lines.push(
    miniStat([
      { label: "Score", value: `${score.obtained} / ${score.max}`, accent: score.percent >= 70 ? "#34d399" : score.percent >= 40 ? "#fbbf24" : "#fb7185" },
      { label: "Percentage", value: `${score.percent}%` },
      { label: "Accuracy", value: pct(score.accuracy) },
      { label: "Attempted", value: `${score.attempted} / ${quiz.questions.length}` },
      { label: "Correct / Wrong / Skipped", value: `${score.correct} / ${score.wrong} / ${score.unattempted}` },
      { label: "Time", value: fmtDuration(score.timeSpentSec) },
    ])
  );
  lines.push("");
  const donutHtml = donutChart(
    [
      { label: "Correct", value: score.correct, color: "#34d399" },
      { label: "Wrong", value: score.wrong, color: "#fb7185" },
      { label: "Skipped", value: score.unattempted, color: "#64748b" },
    ],
    160,
    24,
    `${score.percent}%`,
    "score"
  );
  lines.push(`<div class="chart-row">${donutHtml}<div class="chart-note">Attempt breakdown. Accuracy ${pct(score.accuracy)} of attempted questions.${score.wrong ? ` Negative marking cost: ${round2(score.wrong * (quiz.questions[0]?.negMarks || 0))} marks.` : ""}</div></div>`);
  lines.push("");

  // ---- Section bars ----
  if (score.perSection.length > 1) {
    lines.push("## Section-wise");
    lines.push(
      barChart(
        score.perSection.map((s) => ({
          label: s.name,
          value: s.obtained,
          max: s.max,
          display: `${s.obtained}/${s.max} (${s.accuracy ? pct(s.accuracy) : "—"})`,
          color: s.max ? (s.obtained / s.max >= 0.6 ? "#34d399" : s.obtained / s.max >= 0.35 ? "#fbbf24" : "#fb7185") : "#22d3ee",
        }))
      )
    );
    lines.push("");
  }

  // ---- Topic radar ----
  if (score.perTopic.length >= 3) {
    const byTopic = new Map<string, { ok: number; total: number }>();
    for (const t of score.perTopic) byTopic.set(t.topic, { ok: t.correct, total: t.attempted });
    const axes = [...byTopic.entries()].map(([topic, v]) => ({
      label: topic,
      value: v.total ? v.ok / v.total : 0,
    }));
    lines.push("## Topic Performance");
    lines.push(`<div class="chart-row">${radarChart(axes.slice(0, 8), 300)}</div>`);
    lines.push("");
  }

  // ---- AI verdict ----
  if (ai) {
    lines.push("## Coach Verdict");
    lines.push(`> **${ai.verdict}**`);
    lines.push("");
    lines.push(ai.overview);
    lines.push("");

    if (ai.sectionInsights?.length) {
      lines.push("### Section Insights");
      for (const s of ai.sectionInsights) lines.push(`- **${s.section}** — ${s.observation}`);
      lines.push("");
    }

    lines.push("## 💪 Strengths");
    for (const s of ai.strengths || []) lines.push(`- **${s.title}** — ${s.detail}`);
    lines.push("");

    lines.push("## 🩹 What Needs Work");
    for (const w of ai.weaknesses || []) lines.push(`- **${w.title}** — ${w.detail}  \n  *Fix:* ${w.fix}`);
    lines.push("");

    if (ai.topicBreakdown?.length) {
      lines.push("## Topic Map");
      const rows = ai.topicBreakdown.map((t) => {
        const color = VERDICT_COLORS[t.verdict.toLowerCase()] || "#94a3b8";
        return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;margin:3px;border-radius:999px;background:rgba(148,163,184,0.08);border:1px solid ${color}55"><span style="width:8px;height:8px;border-radius:50%;background:${color}"></span><strong>${t.topic}</strong> — ${t.comment}</span>`;
      });
      lines.push(`<div style="margin:8px 0">${rows.join("")}</div>`);
      lines.push("");
    }

    lines.push("## 🎯 Action Plan");
    for (const a of ai.actionPlan || []) lines.push(`- [ ] ${a}`);
    lines.push("");
    lines.push(callout("danger", "🧭 Reality Check", ai.realityCheck));
    lines.push("");
    lines.push(callout("success", "Rokky Says", ai.motivation));
    lines.push("");
  } else {
    lines.push(callout("info", "No AI analysis", "This report was generated offline (no API key configured). Add a key in **Settings → Models & Keys**, then open this attempt and press **Analyze with AI** for the full coach breakdown."));
    lines.push("");
  }

  // ---- Topic table (always, data-driven) ----
  if (score.perTopic.length) {
    lines.push("## Topic Scorecard");
    lines.push("| Topic | Attempted | Correct | Score | Verdict |");
    lines.push("|---|---|---|---|---|");
    for (const t of score.perTopic) {
      const acc = t.attempted ? t.correct / t.attempted : 0;
      const verdict = t.attempted === 0 ? "🔘 untouched" : acc >= 0.75 ? "🟢 strong" : acc >= 0.4 ? "🟡 ok" : "🔴 weak";
      lines.push(`| ${t.topic} | ${t.attempted} | ${t.correct} | ${t.obtained}/${t.max} | ${verdict} |`);
    }
    lines.push("");
  }

  const sig = `— *${attempt.reportMarkdown ? "Rokky" : "Rokky"} • UDAAN report • generated ${fmtDate(Date.now())}*`;
  lines.push(sig);
  return lines.join("\n");
}

/** Fallback AI-shaped payload when analysis is not run, so the template renders identically. */
export function fallbackReportData(score: ScoreSummary): ReportData {
  const weak = score.perTopic.filter((t) => t.attempted && t.correct / t.attempted < 0.4).map((t) => t.topic);
  const strong = score.perTopic.filter((t) => t.attempted && t.correct / t.attempted >= 0.75).map((t) => t.topic);
  return {
    verdict: score.percent >= 70 ? "Strong performance — keep this standard." : score.percent >= 40 ? "Decent attempt, clear fixes identified." : "Below the safety line — fundamentals first.",
    overview: `You scored ${score.obtained}/${score.max} (${score.percent}%) with ${pct(score.accuracy)} accuracy on attempted questions. ${score.wrong} wrong answers${score.guessAudit.guessedWrong ? `, of which ${score.guessAudit.guessedWrong} look like quick guesses (<8s)` : ""}.`,
    sectionInsights: score.perSection.map((s) => ({ section: s.name, observation: `${s.obtained}/${s.max} (${pct(s.accuracy)} accuracy, ${s.unattempted} skipped).` })),
    strengths: strong.length ? strong.map((t) => ({ title: t, detail: "Above 75% accuracy in this attempt — protect this strength with spaced revision." })) : [{ title: "Attempt discipline", detail: "You engaged with the test — that is the foundation." }],
    weaknesses: weak.length ? weak.map((t) => ({ title: t, detail: "Below 40% accuracy this attempt.", fix: "Generate a focused topic quiz and read the study summary before retrying." })) : [{ title: "Accuracy headroom", detail: "No topic below 40% — push accuracy toward 85%+.", fix: "Increase difficulty and review explanations of every wrong answer." }],
    topicBreakdown: score.perTopic.map((t) => ({ topic: t.topic, verdict: t.attempted === 0 ? "untouched" : t.correct / t.attempted >= 0.75 ? "strong" : t.correct / t.attempted >= 0.4 ? "ok" : "weak", comment: `${t.correct}/${t.attempted} correct.` })),
    actionPlan: ["Run Analyze with AI (add an API key) for a personalised plan.", "Review every wrong answer's explanation.", "Retake a focused quiz on the weakest topic above."],
    realityCheck: `Unattempted questions: ${score.unattempted}. ${score.guessAudit.guessedWrong ? `Guessing looks costly — ${score.guessAudit.guessedWrong} fast wrong answers. With negative marking, guess only after eliminating two options.` : "Manage time so no easy marks are left on the table."}`,
    motivation: "Every topper's report card once looked worse than this. Fix the list above, one quiz at a time. Rokky's watching — make me proud! 🚀",
  };
}

export function reportHeaderStats(attempt: Attempt): string {
  return miniStat([
    { label: "Status", value: attempt.status === "submitted" ? "Submitted" : "In progress" },
    { label: "AI Analysis", value: attempt.aiAnalysis ? "✅ Done" : attempt.aiError ? "⚠️ Failed" : "—" },
  ]);
}

export function readinessRing(r: number): string {
  return progressRing(r / 100, 120, r >= 70 ? "#34d399" : r >= 40 ? "#fbbf24" : "#fb7185", `${Math.round(r)}%`);
}
