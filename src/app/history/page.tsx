"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { StatusBadge } from "@/components/StatusBadge";

type User = { id: string; displayName: string; role: string };
type Child = { id: string; displayName: string };

const SPENDING_CATS: Record<string, string> = {
  food: "食べもの", toy: "おもちゃ", game: "ゲーム",
  book: "ほん", outing: "おでかけ", other: "その他",
};

type HistoryEvent = {
  type: "request" | "cash" | "deduction" | "settlement" | "windfall" | "spending";
  date: string;
  data: Record<string, unknown>;
};

export default function HistoryPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [filterUser, setFilterUser] = useState("");

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    setMe(meData);

    const params = new URLSearchParams();
    if (filterUser) params.set("userId", filterUser);

    const histRes = await fetch(`/api/history?${params}`);
    if (histRes.ok) setEvents(await histRes.json());

    if (meData.role !== "child") {
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const users = await usersRes.json();
        setChildren(users.filter((u: { role: string }) => u.role === "child"));
      }
    }
  }, [router, filterUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterUser) params.set("userId", filterUser);
    window.location.href = `/api/history/export?${params}`;
  };

  if (!me) return null;

  const isParent = me.role === "approver" || me.role === "admin";

  const getEventLabel = (event: HistoryEvent) => {
    switch (event.type) {
      case "request": {
        const d = event.data as { item: { name: string }; minutes: number; status: string };
        return {
          title: d.item?.name ?? "申請",
          subtitle: `${d.minutes >= 0 ? "+" : ""}${d.minutes}分`,
          badge: <StatusBadge status={d.status} />,
          color: "border-blue-100",
        };
      }
      case "cash": {
        const d = event.data as { amount: number; status: string };
        return {
          title: "現金にする",
          subtitle: `${(d.amount as number).toLocaleString()}円`,
          badge: <StatusBadge status={d.status} />,
          color: "border-purple-100",
        };
      }
      case "deduction": {
        const d = event.data as { amount: number; reason: string };
        return {
          title: "運営費",
          subtitle: `-${(d.amount as number).toLocaleString()}円`,
          badge: <span className="text-xs text-purple-700">{d.reason}</span>,
          color: "border-purple-200",
        };
      }
      case "settlement": {
        const d = event.data as { convertedAmount: number; totalMin: number };
        return {
          title: "週次集計",
          subtitle: `${d.convertedAmount >= 0 ? "+" : ""}${(d.convertedAmount as number).toLocaleString()}円`,
          badge: <span className="text-xs text-gray-500">{d.totalMin}分処理</span>,
          color: "border-gray-100",
        };
      }
      case "windfall": {
        const d = event.data as { amount: number; label: string; note?: string };
        return {
          title: `臨時収入: ${d.label}`,
          subtitle: `+${(d.amount).toLocaleString()}円`,
          badge: d.note ? <span className="text-xs text-yellow-700">{d.note}</span> : <span className="text-xs text-yellow-600 font-bold">臨時収入</span>,
          color: "border-yellow-200",
        };
      }
      case "spending": {
        const d = event.data as { amount: number; category: string; memo?: string };
        const catLabel = SPENDING_CATS[d.category] ?? d.category;
        return {
          title: `${catLabel}${d.memo ? `: ${d.memo}` : ""}`,
          subtitle: `-${(d.amount).toLocaleString()}円`,
          badge: <span className="text-xs text-orange-600 font-bold">支出</span>,
          color: "border-orange-200",
        };
      }
    }
  };

  return (
    <div className="lg:pl-64 min-h-screen">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 space-y-4">
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-display" style={{ color: "var(--expo-blue)" }}>きろく</h1>
          {isParent && (
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 min-h-[44px] hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              CSVエクスポート
            </button>
          )}
        </div>

        {isParent && children.length > 0 && (
          <div>
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
          </div>
        )}

        <div className="space-y-2">
          {events.map((event, i) => {
            const label = getEventLabel(event);
            if (!label) return null;
            const d = event.data as { user?: { displayName: string } };
            return (
              <div key={i} className={`bg-white dark:bg-gray-900 rounded-xl p-4 border ${label.color} dark:border-gray-700 shadow-sm`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isParent && d.user && (
                      <p className="text-xs font-bold text-[#1E3A5F] dark:text-blue-400 mb-0.5">{d.user.displayName}</p>
                    )}
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{label.title}</p>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{label.subtitle}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(event.date).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="shrink-0">{label.badge}</div>
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-12">履歴がありません</p>
          )}
        </div>
      </main>
    </div>
  );
}
