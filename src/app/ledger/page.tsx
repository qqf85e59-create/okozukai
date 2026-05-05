"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Coins, Clock, TrendingDown } from "lucide-react";
import { formatMin, formatYen } from "@/lib/format";

type Me = { id: string; displayName: string; role: string };
type Child = { id: string; displayName: string };
type CashOut = {
  id: string;
  grossYen: number;
  feeYen: number;
  netYen: number;
  note: string | null;
  cashedOutAt: string;
};
type TimeLedgerEntry = {
  id: string;
  deltaMinutes: number;
  reason: string;
  note: string | null;
  createdAt: string;
};
type YenLedgerEntry = {
  id: string;
  deltaYen: number;
  reason: string;
  note: string | null;
  createdAt: string;
};

const TIME_REASON_LABELS: Record<string, string> = {
  STUDY: "べんきょう",
  CHORE: "おてつだい",
  PENALTY: "ペナルティ",
  CONSUME: "時間消費",
  ADJUSTMENT: "修正",
  CARRYOVER: "繰越",
};

const YEN_REASON_LABELS: Record<string, string> = {
  CONVERT: "換算",
  CASH_OUT: "換金",
  CASH_FEE: "手数料",
  BONUS: "ボーナス",
  EXPENSE: "実費控除",
  ADJUSTMENT: "修正",
};

type Tab = "time" | "yen" | "cashout";

export default function LedgerPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [cashOuts, setCashOuts] = useState<CashOut[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeLedgerEntry[]>([]);
  const [yenEntries, setYenEntries] = useState<YenLedgerEntry[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [filterUser, setFilterUser] = useState("");
  const [tab, setTab] = useState<Tab>("time");

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    setMe(meData);

    const params = new URLSearchParams();
    if (filterUser) params.set("userId", filterUser);

    const [coRes, tlRes, ylRes] = await Promise.all([
      fetch(`/api/cashouts?${params}`),
      fetch(`/api/time-ledger?${params}`),
      fetch(`/api/yen-ledger?${params}`),
    ]);
    if (coRes.ok) setCashOuts(await coRes.json());
    if (tlRes.ok) setTimeEntries(await tlRes.json());
    if (ylRes.ok) setYenEntries(await ylRes.json());

    if (meData.role !== "child") {
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const users = await usersRes.json();
        setChildren(users.filter((u: { role: string }) => u.role === "child"));
      }
    }
  }, [router, filterUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!me) return null;

  const isParent = me.role === "approver" || me.role === "admin";

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--expo-blue)" }}>
            <Coins className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>台帳（たいちょう）</h1>
        </div>

        {isParent && children.length > 0 && (
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          >
            <option value="">全員</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </select>
        )}

        {/* タブ */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-2xl p-1 shadow-sm" style={{ border: "2px solid #e5e7eb" }}>
          {([["time", "時間", Clock], ["yen", "円", Coins], ["cashout", "換金", TrendingDown]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs transition-all ${tab === key ? "text-white" : "text-gray-500"}`}
              style={tab === key ? { background: "var(--expo-blue)" } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* 時間台帳 */}
        {tab === "time" && (
          <div className="space-y-2">
            {timeEntries.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">記録がありません</p>
            )}
            {timeEntries.map((e) => (
              <div key={e.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm flex items-center gap-3" style={{ border: "2px solid #e5e7eb" }}>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-gray-500">{TIME_REASON_LABELS[e.reason] ?? e.reason}</span>
                  {e.note && <p className="text-xs text-gray-400 truncate">{e.note}</p>}
                  <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className="font-black text-sm shrink-0" style={{ color: e.deltaMinutes >= 0 ? "var(--expo-blue)" : "var(--expo-red)" }}>
                  {e.deltaMinutes >= 0 ? "+" : ""}{formatMin(e.deltaMinutes)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 円台帳 */}
        {tab === "yen" && (
          <div className="space-y-2">
            {yenEntries.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">記録がありません</p>
            )}
            {yenEntries.map((e) => (
              <div key={e.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm flex items-center gap-3" style={{ border: "2px solid #e5e7eb" }}>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-gray-500">{YEN_REASON_LABELS[e.reason] ?? e.reason}</span>
                  {e.note && <p className="text-xs text-gray-400 truncate">{e.note}</p>}
                  <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className="font-black text-sm shrink-0" style={{ color: e.deltaYen >= 0 ? "var(--expo-blue)" : "var(--expo-red)" }}>
                  {e.deltaYen >= 0 ? "+" : ""}{formatYen(e.deltaYen)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 換金履歴 */}
        {tab === "cashout" && (
          <div className="space-y-2">
            {cashOuts.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-12">換金の記録がありません</p>
            )}
            {cashOuts.map((co) => (
              <div key={co.id} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm" style={{ border: "2px solid #e5e7eb" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm" style={{ color: "var(--expo-blue)" }}>換金</p>
                    <p className="font-display text-xl mt-0.5" style={{ color: "var(--expo-blue)" }}>
                      {formatYen(co.netYen)} 受取
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      総額 {formatYen(co.grossYen)} − 手数料 {formatYen(co.feeYen)}
                    </p>
                    {co.note && <p className="text-xs text-gray-500 mt-1">{co.note}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(co.cashedOutAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-black px-2 py-1 rounded-full" style={{ background: "var(--expo-light-blue)", color: "var(--expo-blue)" }}>
                    換金済
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
