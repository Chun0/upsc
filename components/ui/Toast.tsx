"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface Toast {
  id: number;
  text: string;
  kind: "info" | "success" | "error" | "warn";
}

const ToastCtx = createContext<{ toast: (text: string, kind?: Toast["kind"]) => void }>({ toast: () => undefined });

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role="status">
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
