"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import type { StudyPlan } from "@/lib/types";

export default function PlanView({ plan, examName, examId }: { plan: StudyPlan; examName: string; examId: string }) {
  const { toast } = useToast();
  const [genning, setGenning] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  const [showWeekly, setShowWeekly] = useState(false);

  const regenerate = async (ai: boolean) => {
    setGenning(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, useTemplate: !ai }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "plan failed");
      const data = await res.json();
      setLocalPlan(data.plan);
      toast(data.aiGenerated ? "Fresh AI plan built around your weak topics! 🗺️" : "Plan regenerated (template).", "success");
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setGenning(false);
    }
  };

  const weekOf = Math.min(localPlan.weekly.length, 1);

  return (
    <div>
      <div className="row mb16">
        <span className="chip">
          ⏳ {localPlan.weeks} weeks
        </span>
        <span className="chip">⏱️ {localPlan.hoursPerDay} h/day</span>
        <span className="right row">
          <button className="btn small" onClick={() => regenerate(false)} disabled={genning}>
            Template plan
          </button>
          <button className="btn small primary" onClick={() => regenerate(true)} disabled={genning}>
            {genning ? <span className="spinner" /> : "✨"} AI plan (uses weak topics)
          </button>
          <button className="btn small ghost" onClick={() => setShowWeekly(!showWeekly)}>
            {showWeekly ? "Hide" : "Show"} week-by-week
          </button>
        </span>
      </div>

      <div className="grid cols-3">
        {localPlan.phases.map((ph, i) => (
          <div key={ph.name} className="card hoverable">
            <span className="badge info">Phase {i + 1} • {ph.weeks} weeks</span>
            <h3 className="mt8">{ph.name}</h3>
            <div className="small dim mb8">{ph.focus}</div>
            <ul className="small">
              {ph.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {showWeekly ? (
        <div className="card mt16">
          <h3>Week-by-week</h3>
          {localPlan.weekly.slice(0, weekOf ? undefined : 8).map((w) => (
            <div key={w.week} className="topic-row">
              <span className="name" style={{ fontWeight: 700, minWidth: 80 }}>
                Week {w.week}
              </span>
              <span className="name">
                {w.focus}
                <small>{w.tasks.join(" • ")}</small>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="hint mt8">
        Plans adapt: the AI version weights your measured weak topics (from Analytics) into early phases.{" "}
        <Link href={`/analytics?exam=${examId}`}>See your weakness map →</Link>
      </div>
    </div>
  );
}
