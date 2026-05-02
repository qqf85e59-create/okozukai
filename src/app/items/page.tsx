"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { LabelWithGloss } from "@/components/LabelWithGloss";
import { ChevronDown } from "lucide-react";

type User = { id: string; displayName: string; role: string };
type Override = { userId: string; overrideMin: number };
type Item = {
  id: string;
  name: string;
  category: string;
  defaultMin: number;
  isActive: boolean;
  description: string | null;
  overrides: Override[];
  recentRequestsCount: number;
};
type Child = { id: string; displayName: string };

const CATEGORIES = [
  { value: "chore", labelMain: "おてつだい", labelGloss: "おてつだい" },
  { value: "study", labelMain: "べんきょう", labelGloss: "べんきょう" },
  { value: "penalty", labelMain: "マイナス", labelGloss: "マイナス申請" },
];

function formatMin(min: number) {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? "-" : "+";
  if (h === 0) return `${sign}${m}分`;
  return `${sign}${h}時間${m > 0 ? m + "分" : ""}`;
}

/** 分数値ごとのグルーピング（Map<分数値, Item[]>） */
function groupByMin(arr: Item[]): Map<number, Item[]> {
  const map = new Map<number, Item[]>();
  for (const item of arr) {
    const existing = map.get(item.defaultMin) ?? [];
    existing.push(item);
    map.set(item.defaultMin, existing);
  }
  return map;
}

export default function ItemsPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: "", category: "chore", defaultMin: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    setMe(meData);

    if (meData.role !== "approver" && meData.role !== "admin") {
      router.push("/home"); return;
    }

    const [itemsRes, usersRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/users"),
    ]);
    if (itemsRes.ok) setItems(await itemsRes.json());
    if (usersRes.ok) {
      const users = await usersRes.json();
      setChildren(users.filter((u: { role: string }) => u.role === "child"));
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newItem.name,
        category: newItem.category,
        defaultMin: Number(newItem.defaultMin),
      }),
    });
    if (!res.ok) { setError("追加に失敗しました"); return; }
    setNewItem({ name: "", category: "chore", defaultMin: "" });
    setShowAdd(false);
    fetchData();
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("この項目を無効化しますか？")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleOverride = async (itemId: string, userId: string, userName: string, value: string) => {
    const res = await fetch(`/api/items/${itemId}/override`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, overrideMin: Number(value) }),
    });
    if (!res.ok) throw new Error("Failed");
    fetchData();
    setToast(`${userName}の単価を更新しました`);
  };

  if (!me) return null;

  const grouped = CATEGORIES.map((cat) => {
    const catItems = items.filter((i) => i.category === cat.value && i.isActive);
    const plusItems = catItems.filter((i) => i.defaultMin > 0);
    const minusItems = catItems.filter((i) => i.defaultMin <= 0);

    // プラス: 降順（大きい値が先）
    const sortedPlusKeys = [...new Set(plusItems.map((i) => i.defaultMin))].sort((a, b) => b - a);
    // マイナス: 絶対値昇順（小さいマイナスが先）
    const sortedMinusKeys = [...new Set(minusItems.map((i) => i.defaultMin))].sort((a, b) => Math.abs(a) - Math.abs(b));

    return {
      ...cat,
      catItems,
      plusGroups: groupByMin(plusItems),
      minusGroups: groupByMin(minusItems),
      sortedPlusKeys,
      sortedMinusKeys,
      plusCount: plusItems.length,
      minusCount: minusItems.length,
    };
  });

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
      <main className="p-4 pb-24 lg:pb-8 md:max-w-5xl lg:max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display" style={{ color: "var(--expo-blue)" }}>項目設定</h1>
            <div className="hidden sm:flex items-center gap-2">
              {grouped.map(g => (
                <span key={g.value} className="text-[10px] font-bold px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  {g.labelMain}: {g.catItems.length}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg font-bold text-sm min-h-[44px]"
          >
            + 追加
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">新しい項目を追加</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">カテゴリ</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.labelMain}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">項目名</label>
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  placeholder="項目名"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">デフォルト分数</label>
                <input
                  type="number"
                  value={newItem.defaultMin}
                  onChange={(e) => setNewItem({ ...newItem, defaultMin: e.target.value })}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm min-h-[44px] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  placeholder="例: 10 or -10"
                />
              </div>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm min-h-[44px]">キャンセル</button>
              <button type="submit" className="px-4 py-2 bg-[#059669] text-white rounded-lg font-bold text-sm min-h-[44px]">追加</button>
            </div>
          </form>
        )}

        {grouped.map((group) => (
          <section key={group.value}>
            <details className="group" open>
              <summary className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-3 cursor-pointer list-none flex items-center gap-2">
                <LabelWithGloss main={group.labelMain} gloss={group.labelGloss} />
                {/* +N件 / -N件 */}
                {group.plusCount > 0 && (
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: "var(--expo-blue)", color: "white" }}
                  >
                    +{group.plusCount}件
                  </span>
                )}
                {group.minusCount > 0 && (
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: "var(--expo-red)", color: "white" }}
                  >
                    -{group.minusCount}件
                  </span>
                )}
                {group.catItems.length === 0 && (
                  <span className="text-sm font-black bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">0件</span>
                )}
                <ChevronDown size={16} className="ml-auto opacity-50 group-open:rotate-180 transition-transform" />
              </summary>

              <div className="space-y-5">
                {/* プラス項目サブセクション */}
                {group.plusCount > 0 && (
                  <div>
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 text-sm font-black text-white"
                      style={{ background: "var(--expo-blue)" }}
                    >
                      プラス項目
                    </div>
                    <div className="space-y-4">
                      {group.sortedPlusKeys.map((minVal) => {
                        const minItems = group.plusGroups.get(minVal) ?? [];
                        return (
                          <div key={minVal}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                              <span
                                className="text-xs font-black px-2 py-0.5 rounded"
                                style={{ color: "var(--expo-blue)", background: "rgba(0,104,183,0.08)" }}
                              >
                                {formatMin(minVal)}
                              </span>
                              <div className="h-px flex-1 bg-blue-100 dark:bg-blue-900/30" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {minItems.map((item) => (
                                <ItemRow
                                  key={item.id}
                                  item={item}
                                  children={children}
                                  expandedId={expandedId}
                                  setExpandedId={setExpandedId}
                                  onDeactivate={handleDeactivate}
                                  onOverride={handleOverride}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* マイナス項目サブセクション */}
                {group.minusCount > 0 && (
                  <div>
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 text-sm font-black text-white"
                      style={{ background: "var(--expo-red)" }}
                    >
                      マイナス項目
                    </div>
                    <div className="space-y-4">
                      {group.sortedMinusKeys.map((minVal) => {
                        const minItems = group.minusGroups.get(minVal) ?? [];
                        return (
                          <div key={minVal}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                              <span
                                className="text-xs font-black px-2 py-0.5 rounded"
                                style={{ color: "var(--expo-red)", background: "rgba(230,0,18,0.08)" }}
                              >
                                {formatMin(minVal)}
                              </span>
                              <div className="h-px flex-1 bg-red-100 dark:bg-red-900/30" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {minItems.map((item) => (
                                <ItemRow
                                  key={item.id}
                                  item={item}
                                  children={children}
                                  expandedId={expandedId}
                                  setExpandedId={setExpandedId}
                                  onDeactivate={handleDeactivate}
                                  onOverride={handleOverride}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {group.catItems.length === 0 && (
                  <p className="text-gray-400 dark:text-gray-500 text-sm py-4">項目がありません</p>
                )}
              </div>
            </details>
          </section>
        ))}
      </main>
    </div>
  );
}

type ItemRowProps = {
  item: Item;
  children: Child[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onDeactivate: (id: string) => void;
  onOverride: (itemId: string, userId: string, userName: string, value: string) => Promise<void>;
};

function ItemRow({ item, children, expandedId, setExpandedId, onDeactivate, onOverride }: ItemRowProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${expandedId === item.id ? 'md:col-span-2' : ''}`}>
      <div className="p-4 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 dark:text-gray-100 text-sm line-clamp-2" title={item.name}>{item.name}</p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
            デフォルト: <span className="text-gray-600 dark:text-gray-300">{item.defaultMin}分</span>
            <span className="mx-1">・</span>
            直近30日: <span className="text-gray-600 dark:text-gray-300">{item.recentRequestsCount}件</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 min-h-[36px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            個別設定
          </button>
          <button
            onClick={() => onDeactivate(item.id)}
            className="px-3 py-1.5 text-xs border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg min-h-[36px] transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            無効化
          </button>
        </div>
      </div>

      {expandedId === item.id && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">子供別個別設定（分）</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((child) => {
              const ov = item.overrides.find((o) => o.userId === child.id);
              return (
                <OverrideInput
                  key={child.id}
                  child={child}
                  initialValue={ov?.overrideMin ?? item.defaultMin}
                  onSave={(val) => onOverride(item.id, child.id, child.displayName, val)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OverrideInput({ child, initialValue, onSave }: { child: Child, initialValue: number, onSave: (val: string) => Promise<void> }) {
  const [val, setVal] = useState(String(initialValue));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setVal(String(initialValue));
  }, [initialValue]);

  const handleSave = async () => {
    setLoading(true);
    setError(false);
    try {
      await onSave(val);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-2 rounded border border-gray-100 dark:border-gray-700">
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex-1 truncate">{child.displayName}</span>
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm w-16 text-center outline-none focus:border-[var(--expo-blue)] transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
      />
      <button
        onClick={handleSave}
        disabled={loading || val === String(initialValue)}
        className="px-3 py-1.5 bg-[#1E3A5F] text-white rounded font-bold text-[10px] disabled:opacity-50 transition-opacity whitespace-nowrap"
      >
        {loading ? "保存中" : "保存"}
      </button>
      {error && <span className="text-red-500 text-[10px]">エラー</span>}
    </div>
  );
}
