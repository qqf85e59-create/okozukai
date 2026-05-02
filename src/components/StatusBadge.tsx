"use client";

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:  { label: "審査中",            bg: "var(--expo-light-blue)", color: "var(--expo-blue)", border: "var(--expo-blue)" },
  approved: { label: "OK",                  bg: "var(--expo-blue)", color: "white", border: "var(--expo-blue)" },
  rejected: { label: "やりなおし",          bg: "var(--expo-red)", color: "white", border: "var(--expo-red)" },
  settled:  { label: "集計済み",            bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  paid:     { label: "支払済み",            bg: "var(--expo-light-blue)", color: "var(--expo-blue)", border: "var(--expo-blue)" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black"
      style={{ background: cfg.bg, color: cfg.color, border: `2px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}
