"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { Zap } from "lucide-react";
import { formatMin } from "@/lib/format";

type Me = { id: string; displayName: string; role: string };
type BalanceData = { accumulatedMin: number };

const CATEGORIES = [
  { value: "GAME",       label: "ゲーム",           emoji: "🎮" },
  { value: "SMARTPHONE", label: "スマートフォン",   emoji: "📱" },
  { value: "TV",         label: "テレビ",           emoji: "📺" },
  { value: "OTHER",      label: "その他",           emoji: "✨" },
] as const;

export default function ConsumePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [category, setCategory] = useState<"GAME" | "SMARTPHONE" | "TV" | "OTHER">("GAME");
  const [minutes, setMinutes] = useState(30);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    if (meData.role !== "child") { router.push("/home"); return; }
    setMe(meData);

    const balRes = await fetch(`/api/balance/${meData.id}`);
    if (balRes.ok) setBalance((await balRes.json()).balance);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const afterMin = (balance?.accumulatedMin ?? 0) - minutes;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (minutes <= 0) return;
    setSaving(true);
    const res = await fetch("/api/time-consumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, minutesUsed: minutes, memo: memo.trim() || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/home");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "登録に失敗しました");
    }
  }

  if (!me || !balance) return null;

  const selectedCat = CATEGORIES.find((c) => c.value === category)!;

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--expo-red)" }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>時間を使う</h1>
        </div>

        {/* 現在の時間残高 */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm" style={{ border: "2px solid var(--expo-light-blue)" }}>
          <p className="text-xs font-black text-gray-500 tracking-widest text-center">現在の時間残高</p>
          <p className="font-display text-3xl text-center mt-1" style={{ color: balance.accumulatedMin < 0 ? "var(--expo-red)" : "var(--expo-blue)" }}>
            {formatMin(balance.accumulatedMin)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* カテゴリ選択 */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm space-y-3" style={{ border: "2px solid var(--expo-light-blue)" }}>
            <p className="text-sm font-black text-center" style={{ color: "var(--expo-blue)" }}>何に使いましたか？</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className="flex flex-col items-center gap-1 p-3 rounded-2xl text-xs font-black transition-all"
                  style={
                    category === cat.value
                      ? { background: "var(--expo-blue)", color: "white" }
                      : { background: "var(--expo-light-blue)", color: "var(--expo-blue)" }
                  }
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-center leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 分数入力 */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm space-y-3" style={{ border: "2px solid var(--expo-light-blue)" }}>
            <p className="text-sm font-black text-center" style={{ color: "var(--expo-blue)" }}>何分使いましたか？</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setMinutes((m) => Math.max(1, m - 10))}
                className="w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center transition-all active:scale-95"
                style={{ background: "var(--expo-light-blue)", color: "var(--expo-blue)" }}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, Number(e.target.value)))}
                className="w-24 text-center font-display text-3xl bg-transparent border-b-2 outline-none"
                style={{ color: "var(--expo-blue)", borderColor: "var(--expo-blue)" }}
              />
              <span className="font-black text-gray-500">分</span>
              <button
                type="button"
                onClick={() => setMinutes((m) => m + 10)}
                className="w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center transition-all active:scale-95"
                style={{ background: "var(--expo-light-blue)", color: "var(--expo-blue)" }}
              >
                ＋
              </button>
            </div>
          </div>

          {/* 消費後プレビュー */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm" style={{ border: "2px solid var(--expo-light-blue)" }}>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{selectedCat.emoji} {selectedCat.label} に {formatMin(minutes)}</span>
              <span className="font-display text-lg" style={{ color: afterMin < 0 ? "var(--expo-red)" : "var(--expo-blue)" }}>
                → {formatMin(afterMin)}
              </span>
            </div>
            {afterMin < 0 && (
              <p className="text-xs mt-2" style={{ color: "var(--expo-red)" }}>
                ※ 残高がマイナスになります（記録は可能です）
              </p>
            )}
          </div>

          {/* メモ */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm" style={{ border: "2px solid var(--expo-light-blue)" }}>
            <input
              type="text"
              placeholder="メモ（任意）"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={100}
              className="w-full text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
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
              style={{ background: "var(--expo-red)" }}
            >
              {saving ? "登録中..." : "登録する"}
            </button>
          </div>
        </form>
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
