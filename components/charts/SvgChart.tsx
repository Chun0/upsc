"use client";

/** Renders a pre-built SVG string safely (charts built server-side). */
export default function SvgChart({ svg, className = "" }: { svg: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}
