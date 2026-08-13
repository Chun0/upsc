// ============ Small deterministic utilities ============

export function uid(len = 10): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function pct(v: number, digits = 1): string {
  return (v * 100).toFixed(digits) + "%";
}

export function fmtDate(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function todayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function daysBetween(a: number, b: number): number {
  return Math.floor((b - a) / 86400000);
}

export function fmtDuration(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function fmtClock(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Deterministic shuffle using a small LCG so tests & server agree. */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffle<T>(arr: T[]): T[] {
  return seededShuffle(arr, Math.floor(Math.random() * 1e9));
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return key.slice(0, 4) + "…" + key.slice(-4);
}

export function normalizeText(s: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeAnswer(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097F ]/g, " ").replace(/\s+/g, " ").trim();
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export function parseJsonLoose(text: string): any {
  if (!text) throw new Error("Empty model output");
  let t = text.trim();
  // strip markdown fences
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = Math.min(
    ...[t.indexOf("{"), t.indexOf("[")].filter((i) => i >= 0)
  );
  if (start === Infinity || start < 0) throw new Error("No JSON found in model output");
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  const slice = t.slice(start, end + 1);
  return JSON.parse(slice);
}

export function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}
