"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { listExams, getExam } from "@/lib/content/exams";
import { readinessGauge, scoreTrend, subjectRadar, topicTable, typeAccuracy, timeEfficiency, attemptsForExam } from "@/lib/engine/analytics";
import { recommendNext } from "@/lib/engine/mastery";
import type { DbData, ExamDef } from "@/lib/types";
import SvgChart from "@/components/charts/SvgChart";
import Icon from "@/components/ui/Icon";
import { barChart, donutChart, radarChart, sparkline } from "@/lib/report/charts";

function AnalyticsView() {
  const sp = useSearchParams();
  const exams = useMemo(() => listExams(), []);
  const [examId, setExamId] = useState(sp.get("exam") || "upsc-cse");
  const exam: ExamDef = getExam(examId) || exams[0];
  const [db, setDb] = useState<DbData | null>(null);

  useEffect(() => {
    fetch(`/api/analytics?examId=${examId}`)
      .then((r) => r.json())
      .then((d) => setDb(d))
      .catch(() => undefined);
  }, [examId]);

  if (!db) {
    return (
      <div className="loading-block">
        <span className="spinner big" /> Rokky is crunching your numbers…
      </div>
    );
  }

  const now = Date.now();
  const attempts = attemptsForExam(db, examId);
  const gauge = readinessGauge(db, exam);
  const radar = subjectRadar(db, exam);
  const topics = topicTable(db, exam);
  const recs = recommendNext(db.topicStats, exam, now, db.profile?.examDate, 3);
  const trend = scoreTrend(attempts, 10);
  const types = typeAccuracy(db, examId);
  const timing = timeEfficiency(db, examId);

  const strong = topics.filter((t) => t.verdict === "strong").length;
  const weak = topics.filter((t) => t.verdict === "weak").length;
  const developing = topics.filter((t) => t.verdict === "developing").length;
  const untouched = topics.filter((t) => t.verdict === "unrated").length;

  const donut = donutChart(
    [
      { label: "Strong", value: strong, color: "#1d7a43" },
      { label: "Developing", value: developing, color: "#96690c" },
      { label: "Weak", value: weak, color: "#b3261e" },
      { label: "Untouched", value: untouched, color: "#9b9384" },
    ],
    170,
    26,
    `${topics.length}`,
    "topics"
  );

  const accBar = barChart(
    types.map((t) => ({ label: t.type, value: t.attempted ? t.accuracy * 100 : 0, display: t.attempted ? `${Math.round(t.accuracy * 100)}% (${t.attempted})` : "—" })),
    480, 20, 12
  );

  const trendSvg = trend.length >= 2 ? sparkline(trend.map((t) => t.percent), 300, 54, "#2241a8") : "";

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Analytics</div>
        <h1>Your progress report</h1>
        <p className="dim" style={{ maxWidth: 660 }}>
          Adaptive mastery with forgetting-curve decay — readiness is discounted until it&apos;s proven, and
          recommendations are weighted by syllabus importance, PYQ frequency and exam proximity.
        </p>
      </div>

      <div className="row mb16">
        {exams.map((e) => (
          <button key={e.id} className={`chip${examId === e.id ? " on" : ""}`} onClick={() => setExamId(e.id)}>
            {e.icon} {e.name}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="card stat-card hoverable">
          <span className="ico" style={{ color: "var(--ball)" }}><Icon name="target" size={18} /></span>
          <div className="v" style={{ color: gauge.overall >= 70 ? "var(--tick)" : gauge.overall >= 40 ? "var(--amber)" : "var(--red)" }}>{gauge.overall}%</div>
          <div className="l">Readiness (decay-adjusted)</div>
        </div>
        <div className="card stat-card hoverable">
          <span className="ico" style={{ color: "var(--ball)" }}><Icon name="reports" size={18} /></span>
          <div className="v">{attempts.length}</div>
          <div className="l">Submitted attempts</div>
        </div>
        <div className="card stat-card hoverable">
          <span className="ico" style={{ color: "var(--tick)" }}><Icon name="check" size={18} /></span>
          <div className="v" style={{ color: "var(--tick)" }}>{strong}</div>
          <div className="l">Strong topics</div>
        </div>
        <div className="card stat-card hoverable">
          <span className="ico" style={{ color: "var(--red)" }}><Icon name="close" size={18} /></span>
          <div className="v" style={{ color: "var(--red)" }}>{weak}</div>
          <div className="l">Weak topics</div>
        </div>
        <div className="card stat-card hoverable">
          <span className="ico" style={{ color: "var(--ball)" }}><Icon name="clock" size={18} /></span>
          <div className="v">{timing.avgSec ? `${timing.avgSec}s` : "—"}</div>
          <div className="l">Avg time / question</div>
        </div>
      </div>

      <div className="grid cols-2 mt24">
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-display)" }}>Subject readiness radar</h3>
          <SvgChart svg={radarChart(radar.map((r) => ({ label: r.subject, value: r.readiness })), 320)} />
          <div className="hint">Weighted by syllabus importance + your attempt history + forgetting decay.</div>
        </div>
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-display)" }}>Topic verdicts</h3>
          <SvgChart svg={donut} />
          <div className="small dim mt8">
            {strong} strong • {developing} developing • {weak} weak • {untouched} untouched — thresholds: strong ≥72% readiness (≥55% confidence), weak &lt;45%.
          </div>
        </div>
      </div>

      <div className="grid cols-2 mt24">
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-display)" }}>Score trend</h3>
          {trendSvg ? <SvgChart svg={trendSvg} /> : <div className="dim small">Need ≥2 attempts to plot a trend.</div>}
          {trend.length ? (
            <div className="row mt8">
              {trend.slice(-6).map((t, i) => (
                <span key={i} className="chip">
                  {t.label}: {t.percent}%
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-display)" }}>Accuracy by question type</h3>
          <SvgChart svg={accBar} />
        </div>
      </div>

      <div className="section-head">
        <h2>Rokky&apos;s top priorities</h2>
        <div className="line" />
        <Link href={`/practice?exam=${exam.id}`} className="btn small primary">Drill now →</Link>
      </div>
      <div className="grid cols-3">
        {recs.length === 0 ? (
          <div className="card" style={{ gridColumn: "1/-1" }}>
            <div className="empty" style={{ padding: 18 }}>
              <span className="ico">🧭</span>No data yet — take a quiz to seed the mastery map.
            </div>
          </div>
        ) : (
          recs.map((r) => (
            <div key={r.topic} className="card hoverable" style={{ borderLeft: "3px solid var(--red)" }}>
              <div className="row">
                <span className={`badge ${r.verdict === "weak" ? "danger" : r.verdict === "unrated" ? "neutral" : "warn"}`}>{r.verdict}</span>
                <span className="small muted">{r.subject}</span>
              </div>
              <h3 className="mt8" style={{ fontSize: 15.5 }}>{r.topic}</h3>
              <div className="small dim mt8">{r.reason}</div>
              <Link href={`/practice?exam=${exam.id}&topic=${encodeURIComponent(r.topic)}`} className="btn small primary mt16">
                Drill this topic
              </Link>
            </div>
          ))
        )}
      </div>

      <div className="section-head">
        <h2>Full topic map</h2>
        <div className="line" />
      </div>
      <div className="card" style={{ padding: 8 }}>
        {topics.slice(0, 40).map((t) => (
          <div key={t.topic} className="topic-row">
            <span className={`badge ${t.verdict === "strong" ? "success" : t.verdict === "weak" ? "danger" : t.verdict === "developing" ? "warn" : "neutral"}`} style={{ minWidth: 92, justifyContent: "center" }}>
              {t.verdict}
            </span>
            <span className="name" style={{ fontWeight: 600 }}>
              {t.topic}
              <small>{t.subject} • weight {t.weight} • PYQ {t.pyq}/5 • {t.n} attempts</small>
            </span>
            <span className="bar slim" style={{ width: 120, flexShrink: 0 }}>
              <span style={{ display: "block", width: `${Math.round(t.r * 100)}%`, height: "100%", borderRadius: 999, background: t.r >= 0.72 ? "var(--tick)" : t.r >= 0.45 ? "var(--amber)" : "var(--red)" }} />
            </span>
            <span className="small muted" style={{ minWidth: 42, textAlign: "right" }}>{Math.round(t.r * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="loading-block"><span className="spinner" /> Loading…</div>}>
      <AnalyticsView />
    </Suspense>
  );
}
