"use client";

const STATUS_LABELS: Record<string, string> = {
  pending:  "審査中",
  approved: "OK",
  rejected: "やりなおし",
  settled:  "集計済み",
  paid:     "支払済み",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const pillClass = status === "paid" ? "approved" : status;
  return (
    <span className={`concept-pill ${pillClass}`}>
      {label}
    </span>
  );
}
