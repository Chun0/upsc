"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import Icon from "@/components/ui/Icon";
import { sparkline } from "@/lib/report/charts";

interface Props {
  candidateName: string;
  examCountdown: { label: string; days: number } | null;
  streak: number;
  todayQuestions: number;
  goal: number;
  totalMinutes: number;
  attempts: number;
  readiness: number;
  recs: { subject: string; topic: string; reason: string; verdict: string }[];
  targetExam: { id: string; name: string; icon: string; color: string };
  inProgress: { id: string; quizId: string; title: string; startedAt: number; answered: number; total: number }[];
  recent: { id: string; title: string; submittedAt: number; percent: number; max: number; obtained: number }[];
  heat: { date: string; count: number; label?: string }[];
  latestDigest: { id: string; title: string; createdAt: number } | null;
  plan: { weeks: number; examId: string; has: boolean };
  hasKey: boolean;
}

export default function DashboardGrid(p: Props) {
  const { toast } = useToast();
  const [digesting, setDigesting] = useState(false);
  const goalPct = Math.min(100, Math.round((p.todayQuestions / Math.max(1, p.goal)) * 100));
  const chartData = p.recent.slice(0, 8).map((r) => r.percent);
  const spark = chartData.length >= 2 ? sparkline(chartData, 220, 44, "#2241a8") : "";

  const runDigest = async () => {
    setDigesting(true);
    toast("Rokky is scanning today's news for your exam…", "info");
    try {
      const res = await fetch("/api/digest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId: p.targetExam.id }) });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error || "digest failed");
      }
      toast("Today's digest is ready in Study → Daily Digests!", "success");
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setDigesting(false);
    }
  };

  const phase = p.examCountdown
    ? p.examCountdown.days < 45
      ? "Final approach — mock-heavy weeks."
      : p.examCountdown.days < 120
        ? "Syllabus + PYQ consolidation."
        : "Foundation phase — build the base."
    : "No exam date set — urgency ranking is neutral.";

  return (
    <div style={{ marginTop: -24 }}>
      {/* ---------- admit card ---------- */}
      <div className="admit-card">
        <div>
          <div className="field-label">Candidate</div>
          <div className="field-value">{p.candidateName || "Aspirant"}</div>
        </div>
        <div>
          <div className="field-label">Centre / exam</div>
          <div className="field-value">
            {p.targetExam.icon} {p.targetExam.name}
          </div>
        </div>
        <div>
          <div className="field-label">Roll — attempts</div>
          <div className="field-value mono">{String(p.attempts).padStart(4, "0")}</div>
        </div>
        <div>
          <div className="field-label">{p.examCountdown ? "Exam in" : "Exam date"}</div>
          <div className="field-value mono" style={p.examCountdown && p.examCountdown.days < 45 ? { color: "var(--red)" } : undefined}>
            {p.examCountdown ? `${p.examCountdown.days} days` : "not set"}
          </div>
        </div>
        <div style={{ minWidth: 150 }}>
          <div className="field-label">Today's goal</div>
          <div className="field-value mono">
            {p.todayQuestions}/{p.goal}
          </div>
          <div className="bar slim mt8">
            <div style={{ width: `${goalPct}%`, background: goalPct >= 100 ? "var(--tick)" : "var(--ball)" }} />
          </div>
        </div>
        <div className="small dim" style={{ maxWidth: 260 }}>
          {phase}
        </div>
      </div>

      {/* ---------- OMR tally ---------- */}
      <div className="stat-grid mt24">
        {[
          { ico: "flame", v: String(p.streak), l: "Day streak", c: undefined },
          { ico: "pen", v: `${p.todayQuestions}`, l: `Questions today / ${p.goal}`, c: goalPct >= 100 ? "var(--tick)" : undefined },
          { ico: "reports", v: String(p.attempts), l: "Attempts logged", c: undefined },
          { ico: "clock", v: `${p.totalMinutes}m`, l: "Practice time", c: undefined },
          { ico: "target", v: `${p.readiness}%`, l: `${p.targetExam.name} readiness`, c: p.readiness >= 70 ? "var(--tick)" : p.readiness >= 40 ? "var(--amber)" : "var(--red)" },
        ].map((s) => (
          <div key={s.l} className="card stat-card hoverable">
            <span className="ico" style={{ color: "var(--ball)" }}>
              <Icon name={s.ico as never} size={18} />
            </span>
            <div className="v" style={s.c ? { color: s.c } : undefined}>
              {s.v}
            </div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* ---------- countdown / digest / plan ---------- */}
      <div className="grid cols-3 mt24">
        <div className="card hoverable">
          <div className="eyebrow">Exam countdown</div>
          {p.examCountdown ? (
            <>
              <div className="count-big">{p.examCountdown.days}<span style={{ fontSize: "0.5em", color: "var(--ink-3)" }}> days</span></div>
              <div className="dim small">{p.examCountdown.label} — {phase}</div>
            </>
          ) : (
            <div className="mt8">
              <div className="dim small mb8">Set a date and Rokky will rank your urgency.</div>
              <Link href="/settings" className="btn small primary">Set exam date</Link>
            </div>
          )}
        </div>

        <div className="card hoverable">
          <div className="eyebrow">Daily digest</div>
          {p.latestDigest ? (
            <>
              <h3 className="mt8" style={{ fontFamily: "var(--font-display)" }}>{p.latestDigest.title}</h3>
              <Link href={`/study/${p.latestDigest.id}`} className="btn small primary">Read digest →</Link>
            </>
          ) : (
            <div className="mt8">
              <div className="dim small mb8">Exam-relevant news, summarised + 8 MCQs, every day.</div>
              <button className="btn small primary" onClick={runDigest} disabled={digesting || !p.hasKey}>
                {digesting ? <span className="spinner" /> : null} {digesting ? "Scanning news…" : "Generate today's digest"}
              </button>
              {!p.hasKey ? <div className="hint">Needs an API key (Settings → Models &amp; Keys)</div> : null}
            </div>
          )}
        </div>

        <div className="card hoverable">
          <div className="eyebrow">Study plan</div>
          {p.plan.has ? (
            <>
              <h3 className="mt8" style={{ fontFamily: "var(--font-display)" }}>{p.plan.weeks}-week plan</h3>
              <div className="dim small">Phased tasks with weekly targets, built around your weak topics.</div>
              <Link href="/study" className="btn small primary mt8">Open plan →</Link>
            </>
          ) : (
            <div className="mt8">
              <div className="dim small mb8">Rokky builds a plan around your measured gaps.</div>
              <Link href="/study?plan=1" className="btn small primary">Generate study plan</Link>
            </div>
          )}
        </div>
      </div>

      {/* ---------- continue ---------- */}
      {p.inProgress.length > 0 ? (
        <>
          <div className="section-head">
            <h2>Continue where you left off</h2>
            <div className="line" />
          </div>
          <div className="grid cols-3">
            {p.inProgress.map((a) => (
              <Link key={a.id} href={`/quiz/${a.quizId}`} className="card hoverable" style={{ display: "block" }}>
                <div className="row">
                  <span className="badge warn">in progress</span>
                  <span className="small muted">{new Date(a.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <h3 className="mt8" style={{ fontSize: 15 }}>{a.title}</h3>
                <div className="bar slim mt8">
                  <div style={{ width: `${a.total ? Math.round((a.answered / a.total) * 100) : 0}%` }} />
                </div>
                <div className="small muted mt8">{a.answered}/{a.total} answered — resume →</div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {/* ---------- priorities (corrections) ---------- */}
      <div className="section-head">
        <h2>Rokky&apos;s priorities for you</h2>
        <div className="line" />
        <Link href="/analytics" className="btn small ghost">Full analytics →</Link>
      </div>
      <div className="grid cols-3">
        {p.recs.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="empty" style={{ padding: 20 }}>
              <span className="ico">🧭</span>No attempt data yet. Take your first quiz and Rokky will map your gaps.
            </div>
          </div>
        ) : (
          p.recs.map((r, i) => (
            <div key={r.topic} className="card hoverable" style={{ borderLeft: "3px solid var(--red)" }}>
              <div className="row">
                <span className={`badge ${r.verdict === "weak" ? "danger" : r.verdict === "unrated" ? "neutral" : "warn"}`}>{r.verdict}</span>
                <span className="small muted">{r.subject}</span>
                <span className="small muted right" style={{ fontFamily: "var(--font-mono)" }}>#{i + 1}</span>
              </div>
              <h3 className="mt8" style={{ fontSize: 15.5 }}>{r.topic}</h3>
              <div className="small dim mt8">{r.reason}</div>
              <Link href={`/practice?exam=${p.targetExam.id}&topic=${encodeURIComponent(r.topic)}`} className="btn small primary mt16">
                Drill this topic
              </Link>
            </div>
          ))
        )}
      </div>

      {/* ---------- recent + heatmap ---------- */}
      <div className="split mt24" style={{ gridTemplateColumns: "1fr 320px" }}>
        <div className="card">
          <div className="card-title-row">
            <h3 style={{ fontFamily: "var(--font-display)" }}>Recent reports</h3>
            <Link href="/reports" className="right small">all →</Link>
          </div>
          {p.recent.length === 0 ? (
            <div className="dim small">Nothing submitted yet — your first report card awaits.</div>
          ) : (
            p.recent.map((r) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="topic-row" style={{ display: "flex", color: "inherit" }}>
                <span className="name" style={{ fontWeight: 600 }}>
                  {r.title}
                  <small>{new Date(r.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small>
                </span>
                <span className={`badge ${r.percent >= 70 ? "success" : r.percent >= 40 ? "warn" : "danger"}`}>{r.obtained}/{r.max}</span>
              </Link>
            ))
          )}
        </div>
        <div className="card">
          <div className="card-title-row">
            <h3 style={{ fontFamily: "var(--font-display)" }}>Last 60 days</h3>
          </div>
          {spark ? <div dangerouslySetInnerHTML={{ __html: spark }} style={{ margin: "8px 0" }} /> : null}
          <div className="heatmap mt8">
            {p.heat.map((h, i) => (
              <div key={i} className={`cell${h.count > 3 ? " hot" : h.count > 0 ? " on" : ""}`} title={`${h.label || h.date}: ${h.count}`} />
            ))}
          </div>
          <div className="hint mt8">Each square is a day. Darker = more questions answered.</div>
        </div>
      </div>
    </div>
  );
}
