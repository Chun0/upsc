"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { preprocessCallouts, PURIFY_CONFIG } from "@/lib/markdown";

marked.setOptions({ gfm: true, breaks: false });

/** Renders markdown -> sanitized HTML (marked.js + DOMPurify, SVG charts allowed). */
export default function MarkdownView({ content, className = "" }: { content: string; className?: string }) {
  const html = useMemo(() => {
    try {
      const pre = preprocessCallouts(content || "");
      const raw = marked.parse(pre) as string;
      return DOMPurify.sanitize(raw, PURIFY_CONFIG as never);
    } catch {
      return "<p>Rendering error</p>";
    }
  }, [content]);

  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
