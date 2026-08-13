// ============ Markdown pipeline: callout preprocessor + marked config + sanitize rules ============
// Preprocessing runs everywhere; marked+sanitize run in the browser (MarkdownView client component).

/**
 * Converts :::type blocks into <div class="callout type"> before marked parses them.
 * Supported types: success, warn, danger, info, tip.
 */
export function preprocessCallouts(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  const stack: string[] = [];
  const RE = /^:::(\s*)(success|warn|danger|info|tip|warning|error)(\s*)$/i;
  const typeMap: Record<string, string> = { warning: "warn", error: "danger" };
  for (const line of lines) {
    const open = line.match(/^:::\s*(success|warn|danger|info|tip|warning|error)\s*$/i);
    if (open) {
      const t = typeMap[open[1].toLowerCase()] || open[1].toLowerCase();
      stack.push(t);
      out.push(`<div class="callout ${t}">`);
      continue;
    }
    if (/^:::\s*$/.test(line) && stack.length) {
      const t = stack.pop()!;
      out.push(`</div>`);
      void RE;
      void t;
      continue;
    }
    out.push(line);
  }
  while (stack.length) {
    stack.pop();
    out.push("</div>");
  }
  return out.join("\n");
}

/** DOMPurify configuration for client-side sanitization of rendered markdown (keeps our SVG charts). */
export const PURIFY_CONFIG: Record<string, unknown> = {
  ADD_TAGS: [
    "svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "defs", "linearGradient", "radialGradient",
    "stop", "text", "tspan", "title", "desc", "pattern", "marker", "clipPath", "foreignObject",
  ],
  ADD_ATTR: [
    "viewBox", "d", "cx", "cy", "r", "x", "y", "x1", "x2", "y1", "y2", "points", "transform", "fill", "fill-opacity",
    "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset",
    "stop-color", "offset", "font-size", "font-family", "font-weight", "text-anchor", "dominant-baseline", "opacity",
    "gradientUnits", "gradientTransform", "marker-end", "marker-start", "marker-mid", "vector-effect", "preserveAspectRatio",
    "clip-path", "clip-rule", "fill-rule", "class", "role", "aria-label", "style",
  ],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "link", "meta", "base"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "oninput", "onchange", "onSubmit"],
  ALLOW_UNKNOWN_PROTOCOLS: false,
  KEEP_CONTENT: true,
};
