// ============ Pure SVG chart builders (strings — embeddable in markdown, testable) ============
// "Paper & Ink" palette: ink text, ballpoint-blue accents, examiner red for negatives.
import { escapeHtml, round2 } from "../utils";

const INK = "#201d16";
const INK2 = "#5a5344";
const INK3 = "#7d7566";
const TRACK = "rgba(32,29,22,0.10)";
const BALL = "#2241a8";
const RED = "#b3261e";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function donutChart(segments: DonutSegment[], size = 150, thickness = 22, centerLabel = "", centerSub = ""): string {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  let offset = 0;
  const paths: string[] = [];
  for (const seg of segments) {
    const frac = Math.max(0, seg.value) / total;
    const len = frac * circ;
    paths.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thickness}" stroke-dasharray="${len.toFixed(1)} ${(circ - len).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`
    );
    offset += len;
  }
  const label = centerLabel
    ? `<text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="${INK}" font-size="${Math.round(size / 7)}" font-weight="700">${escapeHtml(centerLabel)}</text>` +
      (centerSub ? `<text x="${cx}" y="${cy + Math.round(size / 9)}" text-anchor="middle" fill="${INK3}" font-size="${Math.round(size / 13)}">${escapeHtml(centerSub)}</text>` : "")
    : "";
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="donut chart">${paths.join("")}${label}</svg>`;
}

export interface BarRow {
  label: string;
  value: number;
  max?: number;
  color?: string;
  display?: string;
}

export function barChart(rows: BarRow[], width = 520, barH = 22, gap = 14, color = BALL): string {
  const padL = 170;
  const chartW = width - padL - 60;
  const max = Math.max(1, ...rows.map((r) => (r.max ?? 100) * 1.05), ...rows.map((r) => Math.abs(r.value)));
  const height = rows.length * (barH + gap) + 10;
  const bars = rows
    .map((r, i) => {
      const y = 8 + i * (barH + gap);
      const frac = Math.min(1, Math.abs(r.value) / max);
      const w = Math.max(r.value !== 0 ? 3 : 0, frac * chartW);
      const col = r.color || (r.value < 0 ? RED : color);
      const disp = r.display ?? String(r.value);
      return `<g>
<text x="${padL - 10}" y="${y + barH / 2 + 4}" text-anchor="end" fill="${INK3}" font-size="11.5">${escapeHtml(r.label.length > 24 ? r.label.slice(0, 23) + "…" : r.label)}</text>
<rect x="${padL}" y="${y}" width="${chartW}" height="${barH}" rx="7" fill="${TRACK}"/>
<rect x="${padL}" y="${y}" width="${w}" height="${barH}" rx="7" fill="${col}"/>
<text x="${padL + w + 8}" y="${y + barH / 2 + 4}" fill="${INK}" font-size="12" font-weight="600">${escapeHtml(disp)}</text>
</g>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px" role="img" aria-label="bar chart">${bars}</svg>`;
}

export function radarChart(axes: { label: string; value: number }[], size = 300, color = BALL): string {
  const n = Math.max(3, axes.length);
  const cx = size / 2;
  const cy = size / 2 + 8;
  const R = size / 2 - 46;
  const pt = (i: number, frac: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(ang) * R * frac, cy + Math.sin(ang) * R * frac];
  };
  let grid = "";
  for (let g = 1; g <= 4; g++) {
    const frac = g / 4;
    const poly = Array.from({ length: n }, (_, i) => pt(i, frac).map((v) => v.toFixed(1)).join(",")).join(" ");
    grid += `<polygon points="${poly}" fill="none" stroke="${TRACK}" stroke-width="1"/>`;
  }
  let spokes = "";
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, 1);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${TRACK}"/>`;
  }
  const vals = axes.map((a) => Math.max(0.02, Math.min(1, a.value)));
  const dataPoly = Array.from({ length: n }, (_, i) => pt(i, vals[i]).map((v) => v.toFixed(1)).join(",")).join(" ");
  const dots = Array.from({ length: n }, (_, i) => {
    const [x, y] = pt(i, vals[i]);
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`;
  }).join("");
  const labels = axes
    .map((a, i) => {
      const [x, y] = pt(i, 1.22);
      return `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="${INK2}" font-size="11.5" font-weight="500">${escapeHtml(a.label.length > 16 ? a.label.slice(0, 15) + "…" : a.label)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px" role="img" aria-label="radar chart">${grid}${spokes}<polygon points="${dataPoly}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2"/>${dots}${labels}</svg>`;
}

export function sparkline(values: number[], width = 160, height = 40, color = BALL): string {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * width;
      const y = height - 4 - ((v - min) / span) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `0,${height} ${pts} ${width},${height}`;
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="sparkline"><polygon points="${area}" fill="${color}" fill-opacity="0.12"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

export function progressRing(value: number, size = 120, color = BALL, label = ""): string {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - 14) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * v;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="progress ring">
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TRACK}" stroke-width="12"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
<text x="${cx}" y="${cy + 1}" text-anchor="middle" fill="${INK}" font-size="${Math.round(size / 5.5)}" font-weight="700">${escapeHtml(label || Math.round(v * 100) + "%")}</text>
</svg>`;
}

export function heatmapCell(level: number, color = BALL): string {
  const alpha = level === 0 ? 0.06 : 0.22 + Math.min(0.78, level * 0.16);
  return `rgba(34,65,168,${alpha})`;
}

export function miniStat(rows: { label: string; value: string; accent?: string }[]): string {
  const cells = rows
    .map((r) => `<div style="flex:1;min-width:110px;padding:12px 14px;border-radius:12px;background:rgba(32,29,22,0.04);border:1px solid rgba(32,29,22,0.12)">
<div style="font-size:10px;color:${INK3};text-transform:uppercase;letter-spacing:0.6px">${escapeHtml(r.label)}</div>
<div style="font-size:20px;font-weight:800;color:${r.accent || INK};margin-top:2px">${escapeHtml(r.value)}</div>
</div>`)
    .join("");
  return `<div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0">${cells}</div>`;
}
