"use client";

import { LabelWithGloss } from "@/components/LabelWithGloss";

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
  yenBalance?: number;
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

function formatAmount(amount: number) {
  return amount.toLocaleString("ja-JP") + "円";
}

/** いのちの鼓動ゲージ (Pulse Gauge) */
function PulseGauge({ value, max, isDebt }: { value: number; max: number; isDebt: boolean }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-4 rounded-full overflow-hidden relative bg-gray-100 dark:bg-gray-700" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
      {/* 鼓動感のあるグラデーション */}
      <div
        className="h-full rounded-full transition-all duration-700 relative z-10 pulse-fill"
        style={{
          width: `${pct}%`,
          background: isDebt
            ? "linear-gradient(90deg, #ff4b5c, var(--expo-red))"
            : "linear-gradient(90deg, var(--expo-light-blue), var(--expo-blue))",
          minWidth: pct > 0 ? "8px" : "0",
        }}
      >
        {/* 光沢効果 */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white opacity-20 rounded-t-full" />
      </div>
      {/* 100% 時のミャクミャク目玉 */}
      {pct >= 100 && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 myaku-eye z-20 pulse-beat-hover" />
      )}
    </div>
  );
}

export function BalanceSummary({ displayName, gradeLabel, balance, yenBalance, streak, compact }: Props) {
  const displayAmount = yenBalance ?? balance?.virtualAmount ?? 0;
  const isDebt = displayAmount < 0;
  
  // 背景色: 通常は万博ブルーと白のグラデーション、赤字時は赤ベース
  const headerBg = isDebt
    ? "linear-gradient(135deg, var(--expo-red) 0%, #991b1b 100%)"
    : "linear-gradient(135deg, var(--expo-blue) 0%, #004d8c 100%)";

  // 積み上げ中の進捗（目安: 60分＝1時間を基準）
  const accMin = balance?.accumulatedMin ?? 0;
  const hpMax = Math.max(accMin, 60);

  if (compact) {
    return (
      <div
        className="rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-gray-900"
        style={{ border: `2px solid ${isDebt ? "var(--expo-red)" : "var(--expo-light-blue)"}` }}
      >
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: headerBg }}>
          <div>
            <p className="font-black text-white text-sm tracking-wider">{displayName}</p>
            {gradeLabel && (
              <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>{gradeLabel}</p>
            )}
            {(balance?.accumulatedMin ?? 0) !== 0 && (
              <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                活動中 {formatMinutes(balance?.accumulatedMin ?? 0)}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <p className="font-display text-2xl text-white">
              {formatAmount(displayAmount)}
            </p>
            {isDebt && (
              <span
                className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "white", color: "var(--expo-red)" }}
              >
                <LabelWithGloss main="サポート要請中" gloss="残高マイナス" />
              </span>
            )}
            {streak != null && streak > 0 && (
              <span
                className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "white", color: "var(--expo-blue)" }}
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
      className="rounded-3xl overflow-hidden shadow-lg bg-white dark:bg-gray-900 flex flex-col sm:flex-row"
      style={{ border: `2px solid ${isDebt ? "var(--expo-red)" : "var(--expo-blue)"}` }}
    >
      {/* ヘッダー */}
      <div className="px-6 pt-6 pb-7 sm:w-1/2 flex flex-col justify-between" style={{ background: headerBg }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl text-white tracking-wider">{displayName}</h2>
            {gradeLabel && (
              <span
                className="inline-block mt-2 text-[10px] font-black px-3 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                {gradeLabel}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {isDebt && (
              <span
                className="text-xs font-black px-3 py-1 rounded-full"
                style={{ background: "white", color: "var(--expo-red)" }}
              >
                <LabelWithGloss main="サポート要請中" gloss="残高マイナス" />
              </span>
            )}
            {streak != null && streak > 0 && (
              <span
                className="text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm"
                style={{ background: "white", color: "var(--expo-blue)" }}
              >
                <div className="w-2.5 h-2.5 myaku-eye" />
                <LabelWithGloss main={`${streak}日連続！`} gloss="毎日勉強" />
              </span>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.8)" }}>
            <LabelWithGloss main="いのちの輝き残高" gloss="おこづかい" />
          </p>
          <p className="font-display text-5xl text-white mt-1">
            {formatAmount(displayAmount)}
          </p>
        </div>
      </div>

      {/* ステータス */}
      <div className="px-6 py-5 space-y-4 sm:w-1/2 flex flex-col justify-center bg-white dark:bg-gray-900">
        {/* 鼓動ゲージ（積み上げ中） */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-400">
              <LabelWithGloss main="現在の活動" gloss="今週ためた分" />
            </span>
            <span className="text-sm font-black" style={{ color: "var(--expo-blue)" }}>
              {formatMinutes(accMin)}
            </span>
          </div>
          <PulseGauge
            value={accMin}
            max={hpMax}
            isDebt={isDebt}
          />
        </div>

        <div className="flex justify-between items-center text-sm border-t border-gray-100 dark:border-gray-700 pt-4">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-xs"><LabelWithGloss main="繰越活動量" gloss="来週もちこし分" /></span>
          <span className="font-black text-gray-800 dark:text-gray-100">
            {formatMinutes(balance?.carryoverMin ?? 0)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-xs"><LabelWithGloss main="累計受取金額" gloss="受取済み合計" /></span>
          <span className="font-black text-gray-800 dark:text-gray-100">
            {formatAmount(balance?.totalCashed ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
