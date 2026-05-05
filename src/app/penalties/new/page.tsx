"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { AlertTriangle } from "lucide-react";
import { formatMin } from "@/lib/format";

type Me = { id: string; displayName: string; role: string };
type ChildUser = { id: string; displayName: string };
type PenaltyItemData = {
  id: string;
  name: string;
  penaltyMinutes: number;
  mode: string;
  unitLabel: string | null;
  active: boolean;
  sortOrder: number;
};

export default function PenaltyNewPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [children, setChildren] = useState<ChildUser[]>([]);
  const [penaltyItems, setPenaltyItems] = useState<PenaltyItemData[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [count, setCount] = useState("1");
  const [actualValue, setActualValue] = useState("1");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    if (meData.role !== "approver" && meData.role !== "admin") { router.push("/home"); return; }
    setMe(meData);

    const [usersRes, itemsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/admin/penalty-items"),
    ]);
    if (usersRes.ok) {
      const all: (ChildUser & { role: string })[] = await usersRes.json();
      const kids = all.filter((u) => u.role === "child");
      setChildren(kids);
      if (kids.length === 1) setSelectedUserId(kids[0].id);
    }
    if (itemsRes.ok) {
      const items: PenaltyItemData[] = await itemsRes.json();
      setPenaltyItems(items.filter((i) => i.active).sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const selected = penaltyItems.find((i) => i.id === selectedItemId);
  const isProportional = selected?.mode === "PROPORTIONAL";
  const previewMin = selected
    ? isProportional
      ? selected.penaltyMinutes * Math.max(1, Number(actualValue) || 1)
      : selected.penaltyMinutes * Math.max(1, Number(count) || 1)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !selectedItemId || !reason.trim()) return;
    setSaving(true);
    const res = await fetch("/api/penalty-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        penaltyItemId: selectedItemId,
        count: isProportional ? 1 : Number(count),
        actualValue: isProportional ? Number(actualValue) : undefined,
        occurredAt,
        reason: reason.trim(),
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/home");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "送信に失敗しました");
    }
  }

  if (!me) return null;

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--expo-red)" }}>
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-red)" }}>ペナルティを記録</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 対象の子供 */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm space-y-4" style={{ border: "2px solid #fca5a5" }}>
            <div>
              <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-red)" }}>
                対象 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedUserId(child.id)}
                    className={`px-4 py-2.5 rounded-xl font-black text-sm transition-colors ${
                      selectedUserId === child.id ? "text-white" : "text-gray-600 dark:text-gray-300"
                    }`}
                    style={
                      selectedUserId === child.id
                        ? { background: "var(--expo-red)" }
                        : { border: "2px solid #e5e7eb", background: "transparent" }
                    }
                  >
                    {child.displayName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ペナルティ項目 */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-gray-800" style={{ border: "2px solid #fca5a5" }}>
            {penaltyItems.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">ペナルティ項目がありません</p>
            )}
            {penaltyItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id === selectedItemId ? "" : item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
                  selectedItemId === item.id ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                style={selectedItemId === item.id ? { background: "#fef2f2" } : {}}
              >
                <span
                  className="text-sm font-bold flex-1"
                  style={selectedItemId === item.id ? { color: "var(--expo-red)" } : { color: "" }}
                >
                  {item.name}
                </span>
                <span className="text-sm font-black ml-2 shrink-0" style={{ color: "var(--expo-red)" }}>
                  -{item.penaltyMinutes}分{item.mode === "PROPORTIONAL" && item.unitLabel ? `/${item.unitLabel}` : ""}
                </span>
              </button>
            ))}
          </div>

          {/* 詳細フォーム */}
          {selectedItemId && selectedUserId && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm space-y-4" style={{ border: "2px solid #fca5a5" }}>
              {previewMin !== null && (
                <div className="text-center py-2">
                  <p className="text-xs font-black text-gray-500 tracking-widest">ペナルティ量</p>
                  <p className="font-display text-2xl mt-1" style={{ color: "var(--expo-red)" }}>
                    -{formatMin(previewMin)}
                  </p>
                </div>
              )}

              {selected?.mode === "FIXED" && (
                <div>
                  <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-red)" }}>回数</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-lg font-black text-center bg-gray-50 dark:bg-gray-800 focus:outline-none"
                    style={{ border: "2px solid #fca5a5" }}
                  />
                </div>
              )}
              {selected?.mode === "PROPORTIONAL" && (
                <div>
                  <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-red)" }}>
                    {selected.unitLabel ?? "超過量"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={actualValue}
                    onChange={(e) => setActualValue(e.target.value)}
                    placeholder={selected.unitLabel ?? "値を入力"}
                    className="w-full rounded-2xl px-4 py-3 text-lg font-black text-center bg-gray-50 dark:bg-gray-800 focus:outline-none"
                    style={{ border: "2px solid #fca5a5" }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-red)" }}>発生日</label>
                <input
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 font-bold bg-gray-50 dark:bg-gray-800 focus:outline-none"
                  style={{ border: "2px solid #e5e7eb" }}
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-red)" }}>
                  理由 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="具体的な状況を書いてください"
                  rows={3}
                  required
                  className="w-full rounded-2xl px-4 py-3 text-sm font-bold bg-gray-50 dark:bg-gray-800 resize-none focus:outline-none"
                  style={{ border: "2px solid #fca5a5" }}
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
                  disabled={saving || !reason.trim()}
                  className="flex-1 py-3 rounded-2xl font-black text-white text-sm disabled:opacity-50 transition-all active:scale-95"
                  style={{ background: "var(--expo-red)" }}
                >
                  {saving ? "記録中..." : "記録する"}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
