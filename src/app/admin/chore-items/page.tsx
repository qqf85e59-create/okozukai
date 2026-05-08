"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { ChevronUp, ChevronDown, Trash2, Plus, Check, X } from "lucide-react";

type ChoreItem = {
  id: string;
  category: string;
  name: string;
  bonusMinutes: number;
  mode: string;
  active: boolean;
  sortOrder: number;
};

type Me = { id: string; displayName: string; role: string };

const CATEGORIES = ["おてつだい", "べんきょう"];

export default function AdminChoreItemsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<ChoreItem[]>([]);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "おてつだい", name: "", bonusMinutes: "", mode: "FIXED" });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", bonusMinutes: "", mode: "FIXED" });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    if (meData.role !== "admin" && meData.role !== "approver") { router.push("/home"); return; }
    setMe(meData);

    const res = await fetch("/api/admin/chore-items");
    if (res.ok) setItems(await res.json());
  }, [router]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/chore-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, bonusMinutes: Number(form.bonusMinutes) }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ category: "おてつだい", name: "", bonusMinutes: "", mode: "FIXED" });
      setShowForm(false);
      load();
      showToast("追加しました");
    }
  }

  async function handleEditSave(id: string) {
    setSaving(true);
    await fetch(`/api/admin/chore-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, bonusMinutes: Number(editForm.bonusMinutes) }),
    });
    setSaving(false);
    setEditId(null);
    load();
    showToast("更新しました");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を無効化しますか？`)) return;
    await fetch(`/api/admin/chore-items/${id}`, { method: "DELETE" });
    load();
    showToast("無効化しました");
  }

  async function handleRestore(id: string) {
    await fetch(`/api/admin/chore-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    load();
    showToast("有効化しました");
  }

  async function handleSort(id: string, direction: "up" | "down") {
    const active = items.filter((i) => i.active).sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = active.findIndex((i) => i.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === active.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const a = active[idx];
    const b = active[swapIdx];

    await fetch(`/api/admin/chore-items/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortOrder: b.sortOrder }),
    });
    await fetch(`/api/admin/chore-items/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortOrder: a.sortOrder }),
    });
    load();
  }

  const activeItems = items.filter((i) => i.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const inactiveItems = items.filter((i) => !i.active);
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: activeItems.filter((i) => i.category === cat),
  }));

  if (!me) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>おてつだい・べんきょう項目</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-white text-sm"
            style={{ background: "var(--expo-blue)" }}
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-2xl p-5 space-y-3 shadow" style={{ border: "2px solid var(--expo-light-blue)" }}>
            <h2 className="font-black text-sm" style={{ color: "var(--expo-blue)" }}>新規追加</h2>
            <div className="flex gap-3 flex-wrap">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="rounded-xl px-3 py-2 text-sm font-bold bg-gray-50 dark:bg-gray-800"
                style={{ border: "2px solid #d1d5db" }}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="項目名"
                required
                className="flex-1 rounded-xl px-3 py-2 text-sm font-bold bg-gray-50 dark:bg-gray-800 min-w-[160px]"
                style={{ border: "2px solid #d1d5db" }}
              />
              <input
                type="number" min="0"
                value={form.bonusMinutes}
                onChange={(e) => setForm({ ...form, bonusMinutes: e.target.value })}
                placeholder="分"
                required
                className="w-20 rounded-xl px-3 py-2 text-sm font-bold bg-gray-50 dark:bg-gray-800"
                style={{ border: "2px solid #d1d5db" }}
              />
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="rounded-xl px-3 py-2 text-sm font-bold bg-gray-50 dark:bg-gray-800"
                style={{ border: "2px solid #d1d5db" }}
              >
                <option value="FIXED">固定</option>
                <option value="PROPORTIONAL">比例</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl font-black text-sm text-gray-500" style={{ border: "2px solid #d1d5db" }}>キャンセル</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl font-black text-sm text-white" style={{ background: "var(--expo-blue)" }}>
                {saving ? "保存中..." : "追加"}
              </button>
            </div>
          </form>
        )}

        {grouped.map(({ cat, items: catItems }) => (
          <section key={cat}>
            <h2 className="font-black text-sm text-gray-500 mb-2 tracking-widest">{cat}</h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow divide-y divide-gray-100 dark:divide-gray-800" style={{ border: "2px solid #e5e7eb" }}>
              {catItems.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">項目がありません</p>
              )}
              {catItems.map((item, idx) => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleSort(item.id, "up")} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-20">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleSort(item.id, "down")} disabled={idx === catItems.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-20">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {editId === item.id ? (
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="flex-1 rounded-xl px-3 py-1.5 text-sm font-bold bg-gray-50 dark:bg-gray-800 min-w-[140px]"
                        style={{ border: "2px solid var(--expo-light-blue)" }}
                      />
                      <input
                        type="number" min="0"
                        value={editForm.bonusMinutes}
                        onChange={(e) => setEditForm({ ...editForm, bonusMinutes: e.target.value })}
                        className="w-20 rounded-xl px-3 py-1.5 text-sm font-bold bg-gray-50 dark:bg-gray-800"
                        style={{ border: "2px solid var(--expo-light-blue)" }}
                      />
                      <select
                        value={editForm.mode}
                        onChange={(e) => setEditForm({ ...editForm, mode: e.target.value })}
                        className="rounded-xl px-3 py-1.5 text-sm font-bold bg-gray-50 dark:bg-gray-800"
                        style={{ border: "2px solid var(--expo-light-blue)" }}
                      >
                        <option value="FIXED">固定</option>
                        <option value="PROPORTIONAL">比例</option>
                      </select>
                      <button onClick={() => handleEditSave(item.id)} disabled={saving} className="p-1.5 rounded-lg text-white" style={{ background: "var(--expo-blue)" }}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg text-gray-500" style={{ border: "2px solid #d1d5db" }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex-1 flex items-center gap-3 cursor-pointer"
                      onClick={() => { setEditId(item.id); setEditForm({ name: item.name, bonusMinutes: String(item.bonusMinutes), mode: item.mode }); }}
                    >
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100 flex-1">{item.name}</span>
                      {item.mode === "PROPORTIONAL" && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "var(--expo-light-blue)", color: "var(--expo-blue)" }}>比例</span>
                      )}
                      <span className="text-sm font-black" style={{ color: "var(--expo-blue)" }}>
                        {item.bonusMinutes}分
                        {item.bonusMinutes % 5 !== 0 && (
                          <span title="5分刻みではありません" className="ml-1 text-[10px] px-1 rounded" style={{ background: "#fef3c7", color: "#d97706" }}>⚠</span>
                        )}
                      </span>
                    </div>
                  )}

                  <button onClick={() => handleDelete(item.id, item.name)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}

        {inactiveItems.length > 0 && (
          <section>
            <h2 className="font-black text-sm text-gray-400 mb-2 tracking-widest">無効化済み</h2>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-800" style={{ border: "2px solid #e5e7eb" }}>
              {inactiveItems.map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                  <span className="text-xs font-bold text-gray-400 w-16">{item.category}</span>
                  <span className="flex-1 text-sm font-bold text-gray-500 line-through">{item.name}</span>
                  <span className="text-xs text-gray-400">{item.bonusMinutes}分</span>
                  <button onClick={() => handleRestore(item.id)} className="text-xs font-black px-2 py-1 rounded-lg" style={{ color: "var(--expo-blue)", border: "1px solid var(--expo-light-blue)" }}>
                    有効化
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
