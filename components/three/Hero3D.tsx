"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { RokkyMascot } from "./Mascot";

/**
 * 3D hero scene: scroll pans the camera UP (rotateX + layered translateZ),
 * the rocket flies upward, content lifts away — revealing the dashboard below.
 */
export default function Hero3D({ cta }: { cta?: { label: string; href: string }[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = rootRef.current;
        if (!el) return;
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / (vh * 0.85)));
        el.style.setProperty("--pan", p.toFixed(3));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const chips = [
    { text: "✅ 12/15 correct", big: "Accuracy 80%", style: { left: "6%", top: "22%", animationDelay: "0s" } },
    { text: "🔥 14-day streak", big: "On a roll!", style: { right: "5%", top: "30%", animationDelay: "1.2s" } },
    { text: "📈 Readiness", big: "67% → 74%", style: { left: "10%", bottom: "26%", animationDelay: "2.1s" } },
    { text: "⚡ 2,148 questions", big: "attempted", style: { right: "9%", bottom: "34%", animationDelay: "0.6s" } },
  ];

  return (
    <div className="hero" ref={rootRef}>
      <div className="hero-world">
        {/* star layers */}
        <div className="hero-layer l0">
          <div className="stars" />
        </div>
        <div className="hero-layer l1">
          <div className="stars2" />
          <div className="cloud" style={{ width: 320, height: 90, left: "-8%", top: "18%", animationDuration: "26s" }} />
          <div className="cloud" style={{ width: 460, height: 120, right: "-10%", top: "44%", animationDuration: "34s", animationDirection: "reverse" }} />
        </div>
        <div className="hero-layer l2">
          <div className="cloud" style={{ width: 260, height: 80, left: "16%", bottom: "8%", animationDuration: "22s" }} />
          <div className="cloud" style={{ width: 380, height: 100, right: "6%", top: "6%", animationDuration: "30s", animationDirection: "reverse" }} />
        </div>
      </div>

      {/* floating stat chips */}
      {chips.map((c, i) => (
        <div key={i} className="hero-chip" style={c.style as React.CSSProperties}>
          <div className="big">{c.big}</div>
          <div className="muted">{c.text}</div>
        </div>
      ))}

      {/* Rokky taking off */}
      <div className="rocket">
        <RokkyMascot size={104} />
      </div>

      <div className="hero-content">
        <div className="hero-title">UDAAN</div>
        <div className="hero-sub">
          Your mission control for <strong>UPSC · SSC · Banking · Railways · Defence · State PSC</strong>.
          AI quizzes, honest analytics and a rocket-powered coach named Rokky. 🚀
        </div>
        <div className="hero-cta-row">
          {(cta || [
            { label: "🚀 Launch a Practice Quiz", href: "/practice" },
            { label: "🎯 Take a Mini Mock", href: "/mocks" },
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
