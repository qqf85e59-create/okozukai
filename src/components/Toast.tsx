"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  onDismiss: () => void;
};

export function Toast({ message, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div
      className="fixed top-4 z-50 toast-slide-down"
      style={{ left: "50%", transform: "translateX(-50%)" }}
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-full shadow-xl px-6 py-3 flex items-center gap-3 whitespace-nowrap"
        style={{
          background: "var(--c-bg-elev, white)",
          border: "2px solid var(--c-accent, var(--expo-blue))",
          boxShadow: "var(--c-shadow-pop, 0 20px 40px rgba(0,0,0,0.1))",
          color: "var(--c-fg, var(--expo-dark))",
        }}
      >
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{ background: "var(--c-accent, var(--expo-blue))" }}
        />
        <span className="font-bold text-sm tracking-widest">{message}</span>
      </div>
    </div>
  );
}
