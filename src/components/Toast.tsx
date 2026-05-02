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
          background: "white",
          border: "2px solid var(--expo-blue)",
        }}
      >
        <span
          className="inline-block w-4 h-4 myaku-eye"
        />
        <span className="font-bold text-sm tracking-widest" style={{ color: "var(--expo-blue)" }}>{message}</span>
      </div>
    </div>
  );
}
