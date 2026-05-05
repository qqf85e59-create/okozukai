"use client";

import { useCountUp } from "@/lib/useCountUp";
import { useConcept } from "@/components/ConceptThemeProvider";
import { COPY } from "@/lib/copy";

type BalanceData = {
  accumulatedMin: number;
  carryoverMin: number;
  virtualAmount: number;
  totalCashed: number;
  totalDeducted: number;
};

type Props = {
  displayName: string;
  gradeLabel?: string | null;
  balance: BalanceData | null;
  streak?: number;
  compact?: boolean;
};

function formatMinutes(min: number) {
  const absMin = Math.abs(min);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const sign = min < 0 ? "-" : "";
  if (h === 0) return `${sign}${m}分`;
  return `${sign}${h}時間${m > 0 ? m + "分" : ""}`;
}

export function BalanceSummary({ displayName, gradeLabel, balance, streak, compact }: Props) {
  const isDebt = (balance?.virtualAmount ?? 0) < 0;
  const animatedAmount = useCountUp(balance?.virtualAmount ?? 0);
  const { concept } = useConcept();
  const copy = COPY[concept];

  const accMin = balance?.accumulatedMin ?? 0;
  const goalPct = Math.max(0, Math.min(100, Math.round((animatedAmount / 5000) * 100)));

  if (compact) {
    return (
      <div
        className="rounded-3xl overflow-hidden shadow-sm"
        style={{
          background: "var(--c-surface, white)",
          border: `2px solid ${isDebt ? "var(--c-danger, var(--expo-red))" : "var(--c-border-strong, var(--expo-light-blue))"}`,
        }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{
            background: isDebt
              ? "linear-gradient(135deg, var(--c-danger, var(--expo-red)) 0%, oklch(0.45 0.18 25) 100%)"
              : "linear-gradient(135deg, var(--c-accent, var(--expo-blue)) 0%, var(--c-accent-2, #004d8c) 100%)",
          }}
        >
          <div>
            <p className="font-black text-white text-sm tracking-wider">{displayName}</p>
            {gradeLabel && (
              <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>{gradeLabel}</p>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <p className="font-display text-2xl text-white">
              {animatedAmount.toLocaleString("ja-JP")}円
            </p>
            {isDebt && (
              <span
                className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "white", color: "var(--c-danger, var(--expo-red))" }}
              >
                残高マイナス
              </span>
            )}
            {streak != null && streak > 0 && (
              <span
                className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "white", color: "var(--c-accent, var(--expo-blue))" }}
              >
                {streak}日連続！
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="balance-hero"
      data-debt={isDebt ? "true" : undefined}
      style={isDebt ? {
        background: "linear-gradient(135deg, var(--c-danger, var(--expo-red)) 0%, oklch(0.45 0.18 25) 100%)",
        border: "2px solid var(--c-danger, var(--expo-red))",
        ["--c-fg" as string]: "white",
        ["--c-fg-mute" as string]: "rgba(255,255,255,0.75)",
        ["--c-accent" as string]: "rgba(255,255,255,0.9)",
      } : undefined}
    >
      <span className="concept-starfield" aria-hidden="true" />

      {/* ストリーク・名前バッジ */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div>
          <p className="balance-label">{copy.balance}</p>
          {gradeLabel && (
            <span
              className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", color: "var(--c-fg-mute)", border: "1px solid var(--c-border)" }}
            >
              {gradeLabel}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {streak != null && streak > 0 && (
            <span
              className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ background: "var(--c-bg-elev, white)", color: "var(--c-accent)", border: "1px solid var(--c-border)" }}
            >
              🔥 {streak}日連続
            </span>
          )}
          {isDebt && (
            <span
              className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ background: "var(--c-danger, var(--expo-red))", color: "white" }}
            >
              残高マイナス
            </span>
          )}
        </div>
      </div>

      {/* 名前 */}
      <p className="text-sm font-black mb-1 relative z-10" style={{ color: "var(--c-fg-mute)" }}>{displayName}</p>

      {/* メイン残高 */}
      <div className="balance-value relative z-10">
        {animatedAmount.toLocaleString("ja-JP")}
        <span className="balance-unit">円</span>
      </div>

      {/* 今日・今月の活動 */}
      <div className="balance-meta relative z-10">
        <span>{formatMinutes(accMin)} <b>今週</b></span>
        <span>{formatMinutes(balance?.carryoverMin ?? 0)} <b>繰越</b></span>
        <span style={{ marginLeft: "auto" }}>{(balance?.totalCashed ?? 0).toLocaleString("ja-JP")}円 <b>累計</b></span>
      </div>

      {/* 進捗バー（目安5000円） */}
      <div className="mt-3 relative z-10">
        <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "var(--c-fg-mute)" }}>
          <span>目標まで</span>
          <b style={{ color: "var(--c-fg)" }}>{goalPct}%</b>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${goalPct}%` }} />
        </div>
      </div>
    </div>
  );
}
