"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { ClipboardList } from "lucide-react";

type Me = { id: string; displayName: string; role: string };
type ChoreItemData = { id: string; category: string; name: string; effectiveMin: number; mode: string };

const CATEGORIES = ["おてつだい", "べんきょう"];

export default function ChoreClaimNewPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [choreItems, setChoreItems] = useState<ChoreItemData[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [count, setCount] = useState("1");
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("おてつだい");

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    if (meData.role !== "child") { router.push("/home"); return; }
    setMe(meData);

    const itemsRes = await fetch("/api/chore-items");
    if (itemsRes.ok) setChoreItems(await itemsRes.json());
  }, [router]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  const tabItems = choreItems.filter((i) => i.category === (tab === "おてつだい" ? "chore" : "study"));
  const selected = choreItems.find((i) => i.id === selectedId);

  const previewMin = selected ? selected.effectiveMin * Math.max(1, Number(count) || 1) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    const res = await fetch("/api/chore-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choreItemId: selectedId,
        count: Number(count),
        performedAt,
        note: note.trim() || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/requests");
    } else {
      const err = await res.json().catch(() => ({}));
      setToast(err.error ?? "送信に失敗しました");
    }
  }

  if (!me) return null;

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--expo-blue)" }}>
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>おてつだいを申請</h1>
        </div>

        {/* タブ切替 */}
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setTab(cat); setSelectedId(""); }}
              className={`px-4 py-2 rounded-xl font-black text-sm transition-colors ${tab === cat ? "text-white" : "text-gray-500 bg-white dark:bg-gray-900"}`}
              style={tab === cat ? { background: "var(--expo-blue)" } : { border: "2px solid #e5e7eb" }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 項目一覧 */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow divide-y divide-gray-100 dark:divide-gray-800" style={{ border: "2px solid var(--expo-light-blue)" }}>
          {tabItems.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">項目がありません</p>
          )}
          {tabItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id === selectedId ? "" : item.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${selectedId === item.id ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
              style={selectedId === item.id ? { background: "var(--expo-light-blue)" } : {}}
            >
              <span className={`text-sm font-bold ${selectedId === item.id ? "" : "text-gray-800 dark:text-gray-100"}`}
                style={selectedId === item.id ? { color: "var(--expo-blue)" } : {}}>
                {item.name}
              </span>
              <span className="text-sm font-black ml-2 shrink-0" style={{ color: "var(--expo-blue)" }}>
                +{item.effectiveMin}分
              </span>
            </button>
          ))}
        </div>

        {selectedId && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow space-y-4" style={{ border: "2px solid var(--expo-light-blue)" }}>
            <div className="text-center py-2">
              <p className="text-xs font-black text-gray-500 tracking-widest">選択中</p>
              <p className="font-black text-gray-800 dark:text-gray-100 mt-1">{selected?.name}</p>
              {previewMin > 0 && (
                <p className="font-display text-2xl mt-1" style={{ color: "var(--expo-blue)" }}>+{previewMin}分</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-blue)" }}>回数</label>
              <input
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-lg font-black text-center bg-gray-50 dark:bg-gray-800 focus:outline-none"
                style={{ border: "2px solid var(--expo-light-blue)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-blue)" }}>やった日</label>
              <input
                type="date"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 font-bold bg-gray-50 dark:bg-gray-800 focus:outline-none"
                style={{ border: "2px solid #e5e7eb" }}
              />
            </div>

            <div>
              <label className="block text-sm font-black mb-2 text-gray-500">メモ（任意）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="どんなふうにやったか書いてもいいよ"
                rows={2}
                className="w-full rounded-2xl px-4 py-3 text-sm font-bold bg-gray-50 dark:bg-gray-800 resize-none focus:outline-none"
                style={{ border: "2px solid #e5e7eb" }}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedId("")}
                className="flex-1 py-3 rounded-2xl font-black text-gray-500"
                style={{ border: "2px solid #d1d5db" }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-2xl font-black text-white disabled:opacity-50 transition-all active:scale-95"
                style={{ background: "var(--expo-blue)" }}
              >
                {saving ? "おくっています..." : "申請する"}
              </button>
            </div>
          </form>
        )}
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
