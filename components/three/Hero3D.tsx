"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { RokkyMascot } from "./Mascot";

/**
 * The signature set piece: an OMR answer sheet laid out in real perspective.
 * Scroll pans the camera UP off the sheet (rotateX + translateY + content lift);
 * bubbles fill in a rising "flight path" on load; Rokky climbs the sheet.
 * Pure CSS 3D transforms — no WebGL, no new dependencies (REVAMP_PLAN Phase 3).
 */

const COLS = 14;
const ROWS = 7;

// The rising flight path (bottom-left → top-right) — bubbles the student has filled.
const FLIGHT_PATH: [number, number][] = [
  [6, 0], [6, 1], [5, 2], [5, 3], [4, 3], [4, 4], [4, 5],
  [3, 5], [3, 6], [3, 7], [2, 7], [2, 8], [2, 9],
  [1, 9], [1, 10], [1, 11], [0, 12], [0, 13],
];
// Examiner's red marks (the honest wrong answers).
const RED_MARKS: [number, number][] = [[6, 4], [6, 9], [5, 6], [2, 3]];

function key(r: number, c: number) {
  return `${r}-${c}`;
}

export default function Hero3D({ cta }: { cta?: { label: string; href: string }[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  const filled = useMemo(() => {
    const set = new Set<string>();
    FLIGHT_PATH.forEach(([r, c]) => set.add(key(r, c)));
    return set;
  }, []);
  const red = useMemo(() => {
    const set = new Set<string>();
    RED_MARKS.forEach(([r, c]) => set.add(key(r, c)));
    return set;
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = rootRef.current;
        if (!el) return;
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / (vh * 0.8)));
        el.style.setProperty("--pan", p.toFixed(3));
      });
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover)").matches;
    let mx = 0;
    let my = 0;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      const el = rootRef.current;
      if (!el) return;
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (!reduced && canHover) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const cells = [];
  let fillOrder = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = key(r, c);
      const isFilled = filled.has(k);
      const isRed = red.has(k);
      const cls = `omr-cell${isFilled ? " filled" : ""}${isRed ? " red" : ""}`;
      const delay = isFilled ? fillOrder++ * 55 : 0;
      cells.push(
        <div key={k} className={cls} style={isFilled && !isRed ? { ["--d" as string]: `${delay}ms` } : undefined}>
          <svg viewBox="0 0 40 40">
            <circle className="ring" cx="20" cy="20" r="15" />
            <circle className="dot" cx="20" cy="20" r="9" />
          </svg>
        </div>
      );
    }
  }

  return (
    <div className="hero" ref={rootRef}>
      <div className="hero-world" style={{ transform: "rotateX(calc(var(--pan,0) * 24deg)) translateY(calc(var(--pan,0) * -80px)) rotateY(calc(var(--mx,0) * -3deg)) rotateX(calc(var(--my,0) * 1.5deg))" }}>
        <div className="hero-margin" aria-hidden="true" />
        <div className="hero-sheet" aria-hidden="true">
          {cells}
        </div>
      </div>

      {/* Rokky climbing off the sheet */}
      <div className="hero-plane" aria-hidden="true">
        <RokkyMascot size={96} />
      </div>

      <div className="hero-content">
        <div className="hero-kicker">One copilot · every government exam</div>
        <h1 className="hero-title">
          UDAAN<span className="deva">उड़ान</span>
        </h1>
        <div className="hero-rule" />
        <div className="hero-sub">
          Pattern-faithful papers, honest scores, and a plan that lifts you —
          one bubble at a time.
        </div>
        <div className="hero-cta-row">
          {(cta || [
            { label: "Fill today's bubbles", href: "/practice" },
            { label: "Set a full paper", href: "/mocks" },
          ]).map((c) => (
            <Link key={c.href} href={c.href} className="btn primary big">
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="scroll-hint">scroll to take off ↓</div>
    </div>
  );
}
