"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

/** Scroll-progress tracking + "mark complete" for study docs. */
export default function ReaderActions({ docId, examId, topic }: { docId: string; examId: string; topic: string }) {
  const { toast } = useToast();
  const sent = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      if (p > 0.92 && !sent.current) {
        sent.current = true;
        fetch(`/api/summaries/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        })
          .then(() => toast("Marked as read — activity logged! ✅", "success"))
          .catch(() => undefined);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  return (
    <div className="row">
      <div className="small muted">
        Scrolled to the end? It logs automatically. Then drill it with a quiz — reading without recall fades fast (Rokky's forgetting-curve rule).
      </div>
    </div>
  );
}
