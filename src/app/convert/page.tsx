"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { Timer, Minus, Plus } from "lucide-react";
import { MINUTES_PER_UNIT, YEN_PER_UNIT } from "@/lib/constants";
import { formatMin, formatYen } from "@/lib/format";

type Me = { id: string; displayName: string; role: string };
type BalanceData = { accumulatedMin: number; virtualAmount: number };

export default function ConvertPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [units, setUnits] = useState(1);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    if (meData.role !== "child") { router.push("/home"); return; }
    setMe(meData);

    const balRes = await fetch(`/api/balance/${meData.id}`);
    if (balRes.ok) {
      const data = await balRes.json();
      setBalance(data.balance);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const maxUnits = balance ? Math.floor(balance.accumulatedMin / MINUTES_PER_UNIT) : 0;
  const minutesUsed = units * MINUTES_PER_UNIT;
  const yenGained = units * YEN_PER_UNIT;
  const afterMin = (balance?.accumulatedMin ?? 0) - minutesUsed;
  const afterYen = (balance?.virtualAmount ?? 0) + yenGained;

  function dec() { setUnits((u) => Math.max(1, u - 1)); }
  function inc() { setUnits((u) => Math.min(maxUnits, u + 1)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (units < 1 || units > maxUnits) return;
    setSaving(true);
    const res = await fetch("/api/time-converts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutesUsed }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/home");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "換算に失敗しました");
    }
  }

  if (!me || !balance) return null;

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--expo-blue)" }}>
            <Timer className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>時間を換算する</h1>
        </div>

        {/* 現在残高 */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm" style={{ border: "2px solid var(--expo-light-blue)" }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-black text-gray-500 tracking-widest">現在の時間残高</p>
              <p className="font-display text-2xl mt-1" style={{ color: "var(--expo-blue)" }}>
                {formatMin(balance.accumulatedMin)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-gray-500 tracking-widest">現在の円残高</p>
              <p className="font-display text-2xl mt-1" style={{ color: "var(--expo-blue)" }}>
                {formatYen(balance.virtualAmount)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            レート：{MINUTES_PER_UNIT}分 = {YEN_PER_UNIT}円
          </p>
        </div>

        {maxUnits === 0 ? (
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-center shadow-sm"
            style={{ border: "2px solid #e5e7eb" }}
          >
            <Timer className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "var(--expo-blue)" }} />
            <p className="font-black text-gray-500">
              時間残高が{MINUTES_PER_UNIT}分未満のため<br />換算できません
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ステッパー */}
            <div
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm space-y-4"
              style={{ border: "2px solid var(--expo-light-blue)" }}
            >
              <p className="text-sm font-black text-center" style={{ color: "var(--expo-blue)" }}>
                換算する時間
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={dec}
                  disabled={units <= 1}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
                  style={{ background: "var(--expo-light-blue)", color: "var(--expo-blue)" }}
                >
                  <Minus size={20} strokeWidth={3} />
                </button>
                <div className="text-center min-w-[140px]">
                  <p className="font-display text-3xl" style={{ color: "var(--expo-blue)" }}>
                    {formatMin(minutesUsed)}
                  </p>
                  <p className="text-sm font-black mt-1" style={{ color: "var(--expo-blue)" }}>
                    → {formatYen(yenGained)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={inc}
                  disabled={units >= maxUnits}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
                  style={{ background: "var(--expo-light-blue)", color: "var(--expo-blue)" }}
                >
                  <Plus size={20} strokeWidth={3} />
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                最大 {formatMin(maxUnits * MINUTES_PER_UNIT)}（{maxUnits}回分）まで換算可能
              </p>
            </div>

            {/* 換算後プレビュー */}
            <div
              className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm"
              style={{ border: "2px solid var(--expo-light-blue)" }}
            >
              <p className="text-xs font-black text-gray-500 tracking-widest text-center mb-4">
                換算後の残高
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-400 mb-1">時間残高</p>
                  <p
                    className="font-display text-xl"
                    style={{ color: afterMin < 0 ? "var(--expo-red)" : "var(--expo-blue)" }}
                  >
                    {formatMin(afterMin)}
                  </p>
                </div>
                <div className="text-gray-300 font-black text-lg">→</div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-400 mb-1">円残高</p>
                  <p className="font-display text-xl" style={{ color: "var(--expo-blue)" }}>
                    {formatYen(afterYen)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-3 rounded-2xl font-black text-gray-500 text-sm"
                style={{ border: "2px solid #d1d5db" }}
              >
                もどる
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-2xl font-black text-white text-sm disabled:opacity-50 transition-all active:scale-95"
                style={{ background: "var(--expo-blue)" }}
              >
                {saving ? "換算中..." : "換算する"}
              </button>
            </div>
          </form>
        )}
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
