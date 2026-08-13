"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function ReportReview({
  attemptId,
  aiAnalysis,
  aiError,
  hasMarkdown,
}: {
  attemptId: string;
  aiAnalysis: boolean;
  aiError?: string;
  hasMarkdown: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    setBusy(true);
    toast("Master model is analysing your attempt… 🤖", "info");
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "PATCH" });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error || "analysis failed");
      }
      toast("AI analysis done — report card upgraded! ✨", "success");
      router.refresh();
    } catch (e) {
      toast(String((e as Error).message || e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print row" style={{ gap: 8 }}>
      {aiError ? <span className="badge warn" title={aiError}>⚠️ AI failed</span> : null}
      <button className="btn small" onClick={() => window.print()}>
        🖨️ Print / PDF
      </button>
      {!aiAnalysis && hasMarkdown ? (
        <button className="btn small primary" onClick={analyze} disabled={busy}>
          {busy ? <span className="spinner" /> : "🤖"} {busy ? "Analysing…" : "Analyze with AI"}
        </button>
      ) : aiAnalysis ? (
        <span className="badge success">🤖 AI analysed</span>
      ) : null}
    </div>
  );
}
