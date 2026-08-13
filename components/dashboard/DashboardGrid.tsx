"use client";

import Link from "next/link";
import { useState } from "react";
import Tilt from "@/components/ui/Tilt";
import { useToast } from "@/components/ui/Toast";
import { barChart, sparkline } from "@/lib/report/charts";

interface Props {
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
  const spark = chartData.length >= 2 ? sparkline(chartData, 220, 44) : "";

  const runDigest = async () => {
    setDigesting(true);
    toast("Rokky is scanning today's news for your exam… 📡", "info");
    try {
      const res = await fetch("/api/digest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId: p.targetExam.id }) });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error || "digest failed");
      }
      toast("Today's digest is ready in Study → Daily Digests! 🗞️", "success");
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setDigesting(false);
    }
  };

  return (
    <div style={{ marginTop: -30 }}>
      {/* ------- stat row ------- */}
      <div className="stat-grid">
        <Tilt className="card stat-card hoverable">
          <div className="ico">🔥</div>
          <div className="v">{p.streak}</div>
          <div className="l">Day streak</div>
        </Tilt>
        <Tilt className="card stat-card hoverable">
          <div className="ico">✍️</div>
          <div className="v">
            {p.todayQuestions}
            <span className="small muted">/{p.goal}</span>
          </div>
          <div className="l">Questions today</div>
          <div className="bar slim mt8">
            <div style={{ width: `${goalPct}%`, background: goalPct >= 100 ? "var(--success)" : undefined }} />
          </div>
        </Tilt>
        <Tilt className="card stat-card hoverable">
          <div className="ico">📊</div>
          <div className="v">{p.attempts}</div>
          <div className="l">Attempts logged</div>
        </Tilt>
        <Tilt className="card stat-card hoverable">
          <div className="ico">⏱️</div>
          <div className="v">{p.totalMinutes}m</div>
          <div className="l">Practice time</div>
        </Tilt>
        <Tilt className="card stat-card hoverable">
          <div className="ico">🎯</div>
          <div className="v" style={{ color: p.readiness >= 70 ? "var(--success)" : p.readiness >= 40 ? "var(--warn)" : "var(--danger)" }}>
            {p.readiness}%
          </div>
          <div className="l">{p.targetExam.name} readiness</div>
        </Tilt>
      </div>

      {/* ------- countdown / digest / continue ------- */}
      <div className="grid cols-3 mt24">
        <div className="card hoverable" style={{ background: "linear-gradient(135deg, rgba(109,92,255,0.14), rgba(34,211,238,0.06))" }}>
          <div className="l" style={{ fontSize: 11.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            {p.examCountdown ? `${p.targetExam.icon} ${p.examCountdown.label} in` : `${p.targetExam.icon} Target exam`}
          </div>
          {p.examCountdown ? (
            <>
              <div className="count-big grad-text">{p.examCountdown.days} days</div>
              <div className="dim small">
                {p.examCountdown.days < 45 ? "Final approach — mock-heavy weeks ahead." : p.examCountdown.days < 120 ? "Syllabus + PYQ consolidation phase." : "Foundation phase — build the base."}
              </div>
            </>
          ) : (
            <div className="mt8">
              <div className="dim small mb8">No exam date set — your urgency ranking is neutral.</div>
              <Link href="/settings" className="btn small primary">
                Set exam date
              </Link>
            </div>
          )}
        </div>

        <div className="card hoverable">
          <div className="l" style={{ fontSize: 11.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            🗞️ Daily digest
          </div>
          {p.latestDigest ? (
            <>
              <h3 className="mt8">{p.latestDigest.title}</h3>
              <Link href={`/study/${p.latestDigest.id}`} className="btn small primary">
                Read digest →
              </Link>
            </>
          ) : (
            <div className="mt8">
              <div className="dim small mb8">Fresh exam-relevant news, summarised + 8 MCQs, every day.</div>
              <button className="btn small primary" onClick={runDigest} disabled={digesting || !p.hasKey}>
                {digesting ? <span className="spinner" /> : null} {digesting ? "Scanning news…" : "Generate today's digest"}
              </button>
              {!p.hasKey ? <div className="hint">Needs an API key (Settings → Models & Keys)</div> : null}
            </div>
          )}
        </div>

        <div className="card hoverable">
          <div className="l" style={{ fontSize: 11.5, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            📋 Study plan
          </div>
          {p.plan.has ? (
            <>
              <h3 className="mt8">{p.plan.weeks}-week plan</h3>
              <div className="dim small">Phase-wise tasks with weekly targets.</div>
              <Link href="/study" className="btn small primary mt8">
                Open plan →
              </Link>
            </>
          ) : (
            <div className="mt8">
              <div className="dim small mb8">No plan yet — Rokky can build one around your weak topics.</div>
              <Link href="/study?plan=1" className="btn small primary">
                Generate study plan
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ------- continue in-progress ------- */}
      {p.inProgress.length > 0 ? (
        <div className="section-head">
          <h2>▶️ Continue where you left off</h2>
          <div className="line" />
        </div>
      ) : null}
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
            <div className="small muted mt8">
              {a.answered}/{a.total} answered — resume →
            </div>
          </Link>
        ))}
      </div>

      {/* ------- weak topics ------- */}
      <div className="section-head">
        <h2>🩹 Rokky&apos;s priorities for you</h2>
        <div className="line" />
        <Link href="/analytics" className="btn small ghost">
          Full analytics →
        </Link>
      </div>
      <div className="grid cols-3">
        {p.recs.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="empty" style={{ padding: 20 }}>
              <span className="ico">🧭</span>No attempt data yet. Take your first quiz and Rokky will map your gaps.
            </div>
          </div>
        ) : (
          p.recs.map((r) => (
            <div key={r.topic} className="card hoverable">
              <div className="row">
                <span className={`badge ${r.verdict === "weak" ? "danger" : r.verdict === "unrated" ? "neutral" : "warn"}`}>{r.verdict}</span>
                <span className="small muted">{r.subject}</span>
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

      {/* ------- recent reports + heatmap ------- */}
      <div className="split mt24">
        <div className="card">
          <div className="card-title-row">
            <h3>📊 Recent reports</h3>
            <Link href="/reports" className="right small">
              all →
            </Link>
          </div>
          {p.recent.length === 0 ? (
            <div className="dim small">Nothing submitted yet — your first report card awaits.</div>
          ) : (
            p.recent.map((r) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="topic-row" style={{ display: "flex", color: "inherit" }}>
                <span className="name" style={{ fontWeight: 600 }}>
                  {r.title.length > 44 ? r.title.slice(0, 43) + "…" : r.title}
                  <small>{new Date(r.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} • {r.obtained}/{r.max}</small>
                </span>
                <span className={`badge ${r.percent >= 70 ? "success" : r.percent >= 40 ? "warn" : "danger"}`}>{Math.round(r.percent)}%</span>
              </Link>
            ))
          )}
          {spark ? <div className="mt16" dangerouslySetInnerHTML={{ __html: spark }} /> : null}
        </div>
        <div className="card">
          <div className="card-title-row">
            <h3>🗓️ Last 60 days</h3>
            <span className="small muted right">{p.heat.filter((h) => h.count > 0).length} active days</span>
          </div>
          <div className="heatmap">
            {p.heat.map((h) => (
              <div key={h.date} title={h.label ? `${h.date}: ${h.label}` : h.date} className={`cell${h.count >= 2 ? " hot" : h.count === 1 ? " on" : ""}`} />
            ))}
          </div>
          <div className="hint mt8">Darker = more activity. Rokky loves a full grid.</div>
        </div>
      </div>
    </div>
  );
}
