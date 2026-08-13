"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { listExams } from "@/lib/content/exams";
import { defaultRpm, DEFAULT_RPM } from "@/lib/ai/keypool";
import type { ModelInfo, Profile, Settings } from "@/lib/types";

const PRESET_MODELS = [
  { name: "gemini-flash-latest", label: "Gemini Flash (latest)" },
  { name: "gemini-flash-lite-latest", label: "Gemini Flash-Lite (latest)" },
  { name: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { name: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { name: "gemma-4-31b-it", label: "Gemma 4 (31B)" },
  { name: "gemma-4-26b-a4b-it", label: "Gemma 4 (26B)" },
];

interface KeyRow { id: string; label: string; masked: string; status: string; lastError?: string }

export default function SettingsPage() {
  const { toast } = useToast();
  const exams = useMemo(() => listExams(), []);
  const [tab, setTab] = useState<"profile" | "models" | "orchestration" | "data">("profile");

  const [profile, setProfile] = useState<Profile>({ name: "", targetExamId: "upsc-cse", dailyGoal: 50, onboarded: true });
  const [settings, setSettings] = useState<Settings>({ masterModel: "gemini-flash-latest", slaveModel: "gemini-flash-lite-latest", thinkingLevel: "HIGH", enableSearch: true, rotation: "roundrobin", temperature: null, rateLimits: {} });
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [testingKey, setTestingKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ inFlight: { master: number; slave: number }; recentTasks: { ts: number; lane: string; model: string; ms: number; ok: boolean; error?: string }[] } | null>(null);

  const load = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile((p) => ({ ...p, ...d.profile }));
        if (d.settings) setSettings((s) => ({ ...s, ...d.settings }));
      })
      .catch(() => undefined);
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys || []))
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (tab === "orchestration") {
      const t = setInterval(() => {
        fetch("/api/ai/status")
          .then((r) => r.json())
          .then((d) => setStatus(d))
          .catch(() => undefined);
      }, 4000);
      return () => clearInterval(t);
    }
  }, [tab]);

  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, settings }),
      });
      if (!res.ok) throw new Error("save failed");
      toast("Settings saved ✅", "success");
    } catch {
      toast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const addAndTestKey = async () => {
    if (!newKey.trim()) return;
    setTestingKey(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newKeyLabel, key: newKey.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        toast(`Key added & verified — ${data.modelCount} models available ✅`, "success");
        setNewKey("");
        setNewKeyLabel("");
      } else {
        toast(`Key added but FAILED verification: ${data.error}`, "error");
      }
      load();
    } catch {
      toast("Could not verify key", "error");
    } finally {
      setTestingKey(false);
    }
  };

  const removeKey = async (id: string) => {
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" }).catch(() => undefined);
    load();
    toast("Key removed", "info");
  };

  const fetchModels = async () => {
    setFetchingModels(true);
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.error && !data.models?.length) throw new Error(data.error);
      setModels(data.models || []);
      toast(`Fetched ${(data.models || []).length} live models from Gemini ✅`, "success");
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setFetchingModels(false);
    }
  };

  const modelOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of PRESET_MODELS) map.set(m.name, m.label);
    for (const m of models) map.set(m.name, `${m.displayName || m.name}${m.description ? " — " + m.description.slice(0, 40) : ""}`);
    return [...map.entries()];
  }, [models]);

  const exportData = async () => {
    const res = await fetch("/api/analytics?examId=" + (profile.targetExamId || "upsc-cse"));
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `udaan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup exported 📦", "success");
  };

  return (
    <div>
      <div className="tab-row">
        <button className={`tab${tab === "profile" ? " on" : ""}`} onClick={() => setTab("profile")}>👤 Profile</button>
        <button className={`tab${tab === "models" ? " on" : ""}`} onClick={() => setTab("models")}>🧠 Models & Keys</button>
        <button className={`tab${tab === "orchestration" ? " on" : ""}`} onClick={() => setTab("orchestration")}>🔀 Orchestration</button>
        <button className={`tab${tab === "data" ? " on" : ""}`} onClick={() => setTab("data")}>💾 Data</button>
      </div>

      {tab === "profile" ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3>Profile</h3>
          <div className="field">
            <label className="fld">Name</label>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div className="field">
            <label className="fld">Target exam</label>
            <select value={profile.targetExamId} onChange={(e) => setProfile({ ...profile, targetExamId: e.target.value })}>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>{e.icon} {e.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="fld">Exam date (countdown + urgency ranking)</label>
            <input type="date" value={profile.examDate || ""} onChange={(e) => setProfile({ ...profile, examDate: e.target.value })} />
          </div>
          <div className="field">
            <label className="fld">Daily goal: {profile.dailyGoal} questions</label>
            <input type="range" min={10} max={200} step={10} value={profile.dailyGoal} onChange={(e) => setProfile({ ...profile, dailyGoal: Number(e.target.value) })} />
          </div>
          <button className="btn primary" onClick={saveAll} disabled={saving}>{saving ? <span className="spinner" /> : null} Save profile</button>
        </div>
      ) : null}

      {tab === "models" ? (
        <div className="grid cols-2">
          <div className="card">
            <h3>Model routing</h3>
            <div className="field">
              <label className="fld">🧠 Master model (hard tasks: scoring, reports, plans, digests, validation)</label>
              <select value={settings.masterModel} onChange={(e) => setSettings({ ...settings, masterModel: e.target.value })}>
                {modelOptions.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <div className="hint">Rate-limit default: {defaultRpm(settings.masterModel, settings.rateLimits)} RPM</div>
            </div>
            <div className="field">
              <label className="fld">⚡ Slave model (light tasks: quiz drafts, outlines, flashcards, explain)</label>
              <select value={settings.slaveModel} onChange={(e) => setSettings({ ...settings, slaveModel: e.target.value })}>
                {modelOptions.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <div className="hint">Rate-limit default: {defaultRpm(settings.slaveModel, settings.rateLimits)} RPM</div>
            </div>
            <div className="field">
              <label className="fld">Thinking level</label>
              <div className="row">
                <button className={`chip${settings.thinkingLevel === "HIGH" ? " on" : ""}`} onClick={() => setSettings({ ...settings, thinkingLevel: "HIGH" })}>🔥 HIGH (deep reasoning)</button>
                <button className={`chip${settings.thinkingLevel === "LOW" ? " on" : ""}`} onClick={() => setSettings({ ...settings, thinkingLevel: "LOW" })}>⚡ LOW (faster, cheaper)</button>
              </div>
            </div>
            <div className="field">
              <label className="fld">Google Search grounding (current affairs accuracy)</label>
              <div className="row">
                <button className={`chip${settings.enableSearch ? " on" : ""}`} onClick={() => setSettings({ ...settings, enableSearch: true })}>✅ Enabled</button>
                <button className={`chip${!settings.enableSearch ? " on" : ""}`} onClick={() => setSettings({ ...settings, enableSearch: false })}>❌ Disabled</button>
              </div>
            </div>
            <button className="btn primary" onClick={saveAll} disabled={saving}>{saving ? <span className="spinner" /> : null} Save routing</button>
          </div>

          <div className="card">
            <div className="card-title-row">
              <h3>🔑 API keys ({keys.length})</h3>
              <button className="btn small right" onClick={fetchModels} disabled={fetchingModels}>
                {fetchingModels ? <span className="spinner" /> : "🔄"} {fetchingModels ? "Fetching…" : "Refresh model list"}
              </button>
            </div>
            {keys.length === 0 ? (
              <div className="dim small mb16">No keys yet. Paste a Gemini API key (ai.google.dev → Get API key). Keys stay in your local gitignored ./data folder — never pushed.</div>
            ) : (
              <div className="mb16">
                {keys.map((k) => (
                  <div key={k.id} className="topic-row">
                    <span className="name" style={{ fontWeight: 650 }}>
                      {k.label} <small>{k.masked}</small>
                    </span>
                    <span className={`badge ${k.status === "ok" ? "success" : k.status === "error" ? "danger" : "warn"}`}>{k.status}</span>
                    <button className="btn small danger" onClick={() => removeKey(k.id)}>remove</button>
                  </div>
                ))}
              </div>
            )}
            <div className="field">
              <label className="fld">Label (optional)</label>
              <input value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="e.g. Free tier key" />
            </div>
            <div className="field">
              <label className="fld">Gemini API key</label>
              <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Paste key…" type="password" />
            </div>
            <button className="btn primary grow" onClick={addAndTestKey} disabled={testingKey || !newKey.trim()}>
              {testingKey ? <span className="spinner" /> : null} {testingKey ? "Verifying against Google…" : "Add & verify key"}
            </button>
          </div>
        </div>
      ) : null}

      {tab === "orchestration" ? (
        <div className="grid cols-2">
          <div className="card">
            <h3>Key rotation & rate limits</h3>
            <div className="field">
              <label className="fld">Rotation strategy</label>
              <div className="row">
                <button className={`chip${settings.rotation === "roundrobin" ? " on" : ""}`} onClick={() => setSettings({ ...settings, rotation: "roundrobin" })}>🔁 Round-robin (spread load)</button>
                <button className={`chip${settings.rotation === "failover" ? " on" : ""}`} onClick={() => setSettings({ ...settings, rotation: "failover" })}>🛡️ Failover (stick to primary)</button>
              </div>
              <div className="hint">Round-robin alternates keys per call; failover holds the first healthy key until it errors.</div>
            </div>
            <label className="fld">Per-model RPM overrides (leave 0/empty = safe default)</label>
            {Object.keys(DEFAULT_RPM).map((fam) => (
              <div key={fam} className="row mb8">
                <span className="chip" style={{ minWidth: 150 }}>{fam} (default {DEFAULT_RPM[fam]})</span>
                <input
                  style={{ width: 90 }}
                  type="number"
                  min={0}
                  max={120}
                  placeholder="default"
                  value={settings.rateLimits[fam] ?? ""}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const next = { ...settings.rateLimits };
                    if (!e.target.value || v <= 0) delete next[fam];
                    else next[fam] = v;
                    setSettings({ ...settings, rateLimits: next });
                  }}
                />
              </div>
            ))}
            <div className="hint">2026 free-tier reality: Flash ~15 RPM, Flash-Lite ~30 RPM, Pro paid-only. UDAAN ships conservative defaults (5/15/30) — raise them if your tier allows.</div>
            <button className="btn primary mt8" onClick={saveAll} disabled={saving}>{saving ? <span className="spinner" /> : null} Save orchestration</button>
          </div>
          <div className="card">
            <h3>Live lanes</h3>
            {status ? (
              <>
                <div className="row">
                  <span className={`badge ${status.inFlight.master > 0 ? "warn" : "success"}`}>master lane: {status.inFlight.master > 0 ? "busy" : "idle"}</span>
                  <span className={`badge ${status.inFlight.slave > 0 ? "warn" : "success"}`}>slave lane: {status.inFlight.slave > 0 ? "busy" : "idle"}</span>
                </div>
                <div className="mt16 small dim">
                  {status.recentTasks.length === 0 ? "No tasks yet. Generate a quiz or summary to see the queue in action." : status.recentTasks.slice().reverse().map((t, i) => (
                    <div key={i} className="topic-row" style={{ fontSize: 12 }}>
                      <span className={`badge ${t.ok ? "success" : "danger"}`}>{t.lane}</span>
                      <span className="name">{t.model}<small>{new Date(t.ts).toLocaleTimeString("en-IN")} • {t.ms}ms {t.error ? "• " + t.error : ""}</small></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="loading-block"><span className="spinner" /> Polling orchestrator…</div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "data" ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3>💾 Data</h3>
          <p className="small dim">All data (profile, keys, quizzes, attempts, reports, mastery map) lives in a single JSON file in the gitignored <code>./data</code> folder. It never leaves your machine and is never pushed to GitHub.</p>
          <div className="row mt16">
            <button className="btn" onClick={exportData}>📦 Export backup (JSON)</button>
            <button className="btn danger" onClick={() => { if (confirm("Reset ALL app data? This cannot be undone.")) { fetch("/api/settings/reset", { method: "POST" }).then(() => window.location.reload()); } }}>
              ☢️ Reset all data
            </button>
          </div>
          <div className="divider" />
          <h3>About</h3>
          <p className="small dim">
            UDAAN v1.0 — single-user, local-first exam copilot. Master model {settings.masterModel} handles hard tasks; slave {settings.slaveModel} handles light ones through a rate-limit-aware queue with key rotation. Reports are predesigned markdown cards that the LLM only fills. Built with Next.js, marked.js, @google/genai.
          </p>
        </div>
      ) : null}
    </div>
  );
}
