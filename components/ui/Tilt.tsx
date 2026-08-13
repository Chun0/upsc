"use client";

import { useRef, useState } from "react";

/** 3D tilt-on-hover wrapper for cards. */
export default function Tilt({ children, max = 7, className = "" }: { children: React.ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({ transform: `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-3px)` });
  };
  const onLeave = () => setStyle({ transform: "perspective(900px) rotateX(0deg) rotateY(0deg)" });

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`tilt ${className}`} style={{ ...style, transition: "transform 0.18s ease" }}>
      <div className="tilt-inner">{children}</div>
    </div>
  );
}
