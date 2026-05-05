"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { Coins, AlertCircle, Lightbulb } from "lucide-react";
import { CASHOUT_FEE, YEN_PER_UNIT } from "@/lib/constants";
import { formatYen } from "@/lib/format";

type Me = { id: string; displayName: string; role: string };
type BalanceData = { virtualAmount: number };

export default function CashoutPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
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

  const canCashout = (balance?.virtualAmount ?? 0) >= CASHOUT_FEE;
  const grossYen = balance?.virtualAmount ?? 0;
  const netYen = grossYen - CASHOUT_FEE;

  const nextTotal = grossYen + YEN_PER_UNIT;
  const nextNet = nextTotal - CASHOUT_FEE;

  const daysUntilSaturday = (() => {
    const day = new Date().getDay();
    return day === 6 ? 0 : 6 - day;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCashout) return;
    setSaving(true);
    const res = await fetch("/api/cashouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/home");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "換金に失敗しました");
    }
  }

  if (!me || !balance) return null;

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--expo-blue)" }}>
            <Coins className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>換金する</h1>
        </div>

        {/* 残高サマリ */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm" style={{ border: "2px solid var(--expo-light-blue)" }}>
          <p className="text-xs font-black text-gray-500 tracking-widest text-center mb-3">現在の円残高</p>
          <p className="font-display text-4xl text-center" style={{ color: "var(--expo-blue)" }}>
            {formatYen(grossYen)}
          </p>
        </div>

        {/* 土曜日カウントダウン */}
        {daysUntilSaturday > 0 && (
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: "var(--expo-light-blue)" }}>
            <p className="text-xs font-black" style={{ color: "var(--expo-blue)" }}>
              🗓 次の土曜日まであと<strong>{daysUntilSaturday}日</strong>！まとめて換金しましょう
            </p>
          </div>
        )}
        {daysUntilSaturday === 0 && (
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: "#fef9c3" }}>
            <p className="text-xs font-black text-yellow-700">🎉 今日は土曜日！換金するチャンスです</p>
          </div>
        )}

        {!canCashout ? (
          /* 残高不足 */
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-center shadow-sm space-y-3" style={{ border: "2px solid #e5e7eb" }}>
            <AlertCircle className="w-10 h-10 mx-auto opacity-30" style={{ color: "var(--expo-red)" }} />
            <p className="font-black text-gray-500">
              {CASHOUT_FEE.toLocaleString()}円以上ためると<br />換金できます
            </p>
            <p className="text-xs text-gray-400">
              あと{(CASHOUT_FEE - grossYen).toLocaleString()}円で換金可能になります
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 内訳 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm space-y-3" style={{ border: "2px solid var(--expo-light-blue)" }}>
              <p className="text-xs font-black text-gray-500 tracking-widest text-center">換金の内訳</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">受取前の残高</span>
                  <span className="font-black" style={{ color: "var(--expo-blue)" }}>
                    {formatYen(grossYen)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">手数料</span>
                  <span className="font-black" style={{ color: "var(--expo-red)" }}>
                    △{formatYen(CASHOUT_FEE)}
                  </span>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between items-center">
                  <span className="text-sm font-black text-gray-700 dark:text-gray-200">受取金額</span>
                  <span className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>
                    {formatYen(netYen)}
                  </span>
                </div>
              </div>
            </div>

            {/* 金融教育ヒント */}
            <div className="rounded-2xl p-4 flex gap-3" style={{ background: "var(--expo-light-blue)" }}>
              <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--expo-blue)" }} />
              <p className="text-xs font-bold leading-relaxed" style={{ color: "var(--expo-blue)" }}>
                もし{formatYen(YEN_PER_UNIT)}分さらに換算してから換金すると、
                合計<strong>{formatYen(nextTotal)}</strong>になって
                <strong>{formatYen(nextNet)}</strong>受け取れます！
              </p>
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
                {saving ? "換金中..." : "換金する"}
              </button>
            </div>
          </form>
        )}
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
