"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { getExam } from "@/lib/content/exams";
import { listExams } from "@/lib/content/exams";
import { RokkyMascot } from "@/components/three/Mascot";

interface Profile {
  name: string;
  targetExamId: string;
  examDate?: string;
  dailyGoal: number;
  onboarded: boolean;
}

/** First-run onboarding: name, target exam, exam date, daily goal. */
export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({ name: "", targetExamId: "upsc-cse", dailyGoal: 50, onboarded: false });
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile && !d.profile.onboarded) {
          setProfile((p) => ({ ...p, ...d.profile }));
          setOpen(true);
        }
      })
      .catch(() => undefined);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: { ...profile, onboarded: true } }),
      });
      if (!res.ok) throw new Error("save failed");
      setOpen(false);
      toast("Welcome aboard — Rokky is ready to fly. 🚀", "success");
    } catch {
      toast("Could not save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => undefined} title="Before you take off — four quick marks">
      <div className="row mb16" style={{ alignItems: "center", gap: 12 }}>
        <RokkyMascot size={48} />
        <p className="small dim" style={{ margin: 0 }}>
          One minute of setup. Every paper, plan and report from here is built around these four answers.
        </p>
      </div>
      <div className="field">
        <label className="fld">What should Rokky call you?</label>
        <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Your name, topper-to-be" autoFocus />
      </div>
      <div className="field">
        <label className="fld">Primary target exam</label>
        <select value={profile.targetExamId} onChange={(e) => setProfile({ ...profile, targetExamId: e.target.value })}>
          {listExams().map((e) => (
            <option key={e.id} value={e.id}>
              {e.icon} {e.name} — {e.org}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="fld">Exam date (optional — powers your countdown &amp; urgency ranking)</label>
        <input type="date" value={profile.examDate || ""} onChange={(e) => setProfile({ ...profile, examDate: e.target.value })} />
      </div>
      <div className="field">
        <label className="fld">Daily question goal: {profile.dailyGoal} questions/day</label>
        <input type="range" min={10} max={200} step={10} value={profile.dailyGoal} onChange={(e) => setProfile({ ...profile, dailyGoal: Number(e.target.value) })} />
        <div className="hint">Rokky will nudge you (lovingly) if you miss it.</div>
      </div>
      <div className="row">
        <button className="btn primary big grow" onClick={save} disabled={saving || !profile.name.trim()}>
          {saving ? <span className="spinner" /> : null} {saving ? "Filling your admit card…" : "Let's take off"}
        </button>
      </div>
      <div className="hint mt8 center">Add a Gemini API key in Settings → Models &amp; Keys to unlock AI quiz generation &amp; coach analysis.</div>
    </Modal>
  );
}
