"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { getExam } from "@/lib/content/exams";
import { listExams } from "@/lib/content/exams";

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
      toast("Welcome aboard, pilot! Rokky is ready. 🚀", "success");
    } catch {
      toast("Could not save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => undefined} title="🚀 Welcome to UDAAN — one quick pre-flight check">
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
        <label className="fld">Exam date (optional — powers your countdown & urgency ranking)</label>
        <input type="date" value={profile.examDate || ""} onChange={(e) => setProfile({ ...profile, examDate: e.target.value })} />
      </div>
      <div className="field">
        <label className="fld">Daily question goal: {profile.dailyGoal} questions/day</label>
        <input type="range" min={10} max={200} step={10} value={profile.dailyGoal} onChange={(e) => setProfile({ ...profile, dailyGoal: Number(e.target.value) })} />
        <div className="hint">Rokky will nag you (lovingly) if you miss it.</div>
      </div>
      <div className="row">
        <button className="btn primary big grow" onClick={save} disabled={saving || !profile.name.trim()}>
          {saving ? <span className="spinner" /> : null} Let&apos;s take off! 🚀
        </button>
      </div>
      <div className="hint mt8 center">Tip: add your Gemini API key in Settings → Models & Keys to unlock AI quiz generation & coach analysis.</div>
    </Modal>
  );
}
