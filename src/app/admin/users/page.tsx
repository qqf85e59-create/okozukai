"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { Users, X, Save, AlertTriangle, Gift, Plus, Trash2, SlidersHorizontal } from "lucide-react";

type ScheduledBonus = {
  id: string;
  userId: string;
  label: string;
  type: string;
  amountYen: number;
  dayOfMonth: number | null;
  isActive: boolean;
  user: { displayName: string };
};

type GradeInfo = { gradeLabel: string } | null;
type AdminUser = {
  id: string;
  displayName: string;
  role: string;
  birthDate: string | null;
  gradeOverride: string | null;
  exchangeRate: number | null;
  colorToken: string | null;
  isActive: boolean;
  createdAt: string;
  grade: GradeInfo;
};

type Me = { id: string; displayName: string; role: string };

const COLOR_PRESETS = [
  { label: "ブルー",     value: "#0068B7" },
  { label: "レッド",     value: "#E60012" },
  { label: "グリーン",   value: "#00873C" },
  { label: "パープル",   value: "#7C3AED" },
  { label: "オレンジ",   value: "#F97316" },
  { label: "ピンク",     value: "#EC4899" },
  { label: "ティール",   value: "#0D9488" },
  { label: "グレー",     value: "#6B7280" },
];

const ROLE_LABELS: Record<string, string> = {
  child: "子供",
  approver: "親",
  admin: "管理者",
};

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    approver: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    child: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  };
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colors[role] ?? "bg-gray-100 text-gray-700"}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [bonuses, setBonuses] = useState<ScheduledBonus[]>([]);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [bonusForm, setBonusForm] = useState({ userId: "", label: "", type: "monthly", amountYen: "", dayOfMonth: "" });
  const [bonusSaving, setBonusSaving] = useState(false);

  // フォーム
  const [form, setForm] = useState({
    displayName: "",
    birthDate: "",
    gradeOverride: "",
    exchangeRate: "",
    colorToken: "",
    isActive: true,
  });

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  const fetchBonuses = useCallback(async () => {
    const res = await fetch("/api/admin/scheduled-bonuses");
    if (res.ok) setBonuses(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/"); return; }
      const meData: Me = await meRes.json();
      if (meData.role !== "admin") { router.push("/home"); return; }
      setMe(meData);
      fetchUsers();
      fetchBonuses();
    })();
  }, [router, fetchUsers, fetchBonuses]);

  const openUser = (u: AdminUser) => {
    setSelected(u);
    setForm({
      displayName: u.displayName,
      birthDate: u.birthDate ? u.birthDate.substring(0, 10) : "",
      gradeOverride: u.gradeOverride ?? "",
      exchangeRate: u.exchangeRate != null ? String(u.exchangeRate) : "",
      colorToken: u.colorToken ?? "",
      isActive: u.isActive,
    });
  };

  const handleSaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setShowConfirm(false);
    const res = await fetch(`/api/admin/users/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        birthDate: form.birthDate || null,
        gradeOverride: form.gradeOverride || null,
        exchangeRate: form.exchangeRate !== "" ? Number(form.exchangeRate) : null,
        colorToken: form.colorToken || null,
        isActive: form.isActive,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setToast("保存しました");
      setSelected(null);
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      setToast(data.error ?? "保存に失敗しました");
    }
  };

  const exchangeRateChanged =
    selected != null &&
    form.exchangeRate !== (selected.exchangeRate != null ? String(selected.exchangeRate) : "");

  const handleAddBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusForm.userId || !bonusForm.label || !bonusForm.amountYen) return;
    setBonusSaving(true);
    const body: Record<string, unknown> = {
      userId: bonusForm.userId,
      label: bonusForm.label,
      type: bonusForm.type,
      amountYen: Number(bonusForm.amountYen),
    };
    if (bonusForm.type === "monthly" && bonusForm.dayOfMonth) {
      body.dayOfMonth = Number(bonusForm.dayOfMonth);
    }
    const res = await fetch("/api/admin/scheduled-bonuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBonusSaving(false);
    if (res.ok) {
      setToast("ボーナスを追加しました");
      setShowBonusForm(false);
      setBonusForm({ userId: "", label: "", type: "monthly", amountYen: "", dayOfMonth: "" });
      fetchBonuses();
    }
  };

  const handleToggleBonus = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/scheduled-bonuses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchBonuses();
  };

  const handleDeleteBonus = async (id: string) => {
    await fetch(`/api/admin/scheduled-bonuses/${id}`, { method: "DELETE" });
    fetchBonuses();
    setToast("削除しました");
  };

  if (!me) return null;

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}

      <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3 mt-2">
          <Users size={24} style={{ color: "var(--expo-blue)" }} />
          <h1 className="text-2xl font-display" style={{ color: "var(--expo-blue)" }}>ユーザー管理</h1>
        </div>

        {/* ユーザー一覧テーブル */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-4 py-3 font-black text-gray-600 dark:text-gray-300 text-xs tracking-wider">名前</th>
                <th className="text-left px-4 py-3 font-black text-gray-600 dark:text-gray-300 text-xs tracking-wider hidden sm:table-cell">ロール</th>
                <th className="text-left px-4 py-3 font-black text-gray-600 dark:text-gray-300 text-xs tracking-wider hidden md:table-cell">学年</th>
                <th className="text-left px-4 py-3 font-black text-gray-600 dark:text-gray-300 text-xs tracking-wider hidden md:table-cell">識別色</th>
                <th className="text-left px-4 py-3 font-black text-gray-600 dark:text-gray-300 text-xs tracking-wider">状態</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => openUser(u)}
                  className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.colorToken && (
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: u.colorToken }} />
                      )}
                      <span className="font-bold text-gray-800 dark:text-gray-100">{u.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {u.gradeOverride ?? u.grade?.gradeLabel ?? "-"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {u.colorToken
                      ? <div className="w-5 h-5 rounded" style={{ background: u.colorToken }} />
                      : <span className="text-gray-400 dark:text-gray-500">-</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      u.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {u.isActive ? "有効" : "無効"}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    ユーザーがいません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 定期ボーナス管理 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift size={20} style={{ color: "var(--expo-blue)" }} />
              <h2 className="text-lg font-display" style={{ color: "var(--expo-blue)" }}>定期ボーナス</h2>
            </div>
            <button
              onClick={() => setShowBonusForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black text-white"
              style={{ background: "var(--expo-blue)" }}
            >
              <Plus size={14} /> 追加
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {bonuses.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-6">定期ボーナスがありません</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {bonuses.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-gray-800 dark:text-gray-100">{b.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
                        {b.user.displayName} ·{" "}
                        {b.type === "birthday" ? "誕生日" : `毎月${b.dayOfMonth ?? "?"}日`} ·{" "}
                        {b.amountYen.toLocaleString("ja-JP")}円
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleBonus(b.id, b.isActive)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${b.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${b.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                      <button onClick={() => handleDeleteBonus(b.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* 定期ボーナス追加モーダル */}
      {showBonusForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-5 py-4 text-white" style={{ background: "var(--expo-blue)" }}>
              <p className="font-display text-base">定期ボーナスを追加</p>
              <button onClick={() => setShowBonusForm(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddBonus} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1">対象ユーザー</label>
                <select
                  value={bonusForm.userId}
                  onChange={(e) => setBonusForm({ ...bonusForm, userId: e.target.value })}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  <option value="">選択してください</option>
                  {users.filter(u => u.role === "child").map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1">名称</label>
                <input
                  value={bonusForm.label}
                  onChange={(e) => setBonusForm({ ...bonusForm, label: e.target.value })}
                  required
                  placeholder="例: 月のおこづかい"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1">種類</label>
                <select
                  value={bonusForm.type}
                  onChange={(e) => setBonusForm({ ...bonusForm, type: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  <option value="monthly">毎月定額</option>
                  <option value="birthday">誕生日</option>
                </select>
              </div>
              {bonusForm.type === "monthly" && (
                <div>
                  <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1">毎月何日に付与？</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={bonusForm.dayOfMonth}
                    onChange={(e) => setBonusForm({ ...bonusForm, dayOfMonth: e.target.value })}
                    placeholder="例: 1"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1">金額（円）</label>
                <input
                  type="number"
                  min="1"
                  value={bonusForm.amountYen}
                  onChange={(e) => setBonusForm({ ...bonusForm, amountYen: e.target.value })}
                  required
                  placeholder="例: 1000"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowBonusForm(false)} className="flex-1 py-3 rounded-xl font-black text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">キャンセル</button>
                <button type="submit" disabled={bonusSaving} className="flex-1 py-3 rounded-xl font-black text-white disabled:opacity-50" style={{ background: "var(--expo-blue)" }}>
                  {bonusSaving ? "追加中..." : "追加する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* サイドパネル */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-full overflow-y-auto">
            {/* パネルヘッダー */}
            <div
              className="flex items-center justify-between px-5 py-4 text-white shrink-0"
              style={{ background: "var(--expo-blue)" }}
            >
              <div>
                <p className="font-display text-lg">{selected.displayName}</p>
                <RoleBadge role={selected.role} />
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* フォーム */}
            <form onSubmit={handleSaveRequest} className="flex-1 p-5 space-y-5">

              {/* displayName */}
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 tracking-wider">
                  表示名 <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* birthDate */}
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 tracking-wider">
                  生年月日（任意）
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {form.birthDate && !form.gradeOverride && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                    自動学年: {selected.grade?.gradeLabel ?? "-"}
                  </p>
                )}
              </div>

              {/* gradeOverride */}
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 tracking-wider">
                  学年上書き（任意・空欄で自動算出）
                </label>
                <input
                  value={form.gradeOverride}
                  onChange={(e) => setForm({ ...form, gradeOverride: e.target.value })}
                  placeholder="例: 小学3年"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* exchangeRate */}
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 tracking-wider">
                  換算レート（分→円、任意・空欄でシステム既定値）
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.exchangeRate}
                  onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
                  placeholder="例: 10"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* colorToken */}
              <div>
                <label className="block text-xs font-black text-gray-600 dark:text-gray-300 mb-1.5 tracking-wider">
                  識別色（任意）
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, colorToken: c.value })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors ${
                        form.colorToken === c.value
                          ? "border-gray-800 dark:border-white"
                          : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full" style={{ background: c.value }} />
                      <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400">{c.label}</span>
                    </button>
                  ))}
                </div>
                {form.colorToken && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, colorToken: "" })}
                    className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 underline"
                  >
                    クリア
                  </button>
                )}
              </div>

              {/* isActive */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-sm font-black text-gray-700 dark:text-gray-200">アカウント有効</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    form.isActive ? "translate-x-7" : "translate-x-1"
                  }`} />
                </button>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b" }}
              >
                <Save size={16} />
                {saving ? "保存中..." : "保存する"}
              </button>
              {selected.role === "child" && (
                <button
                  type="button"
                  onClick={() => router.push(`/admin/users/${selected.id}/overrides`)}
                  className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300"
                  style={{ border: "2px solid #d1d5db" }}
                >
                  <SlidersHorizontal size={16} />
                  個別時間設定
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <AlertTriangle size={18} className="text-amber-500 shrink-0" />
              <p className="font-black">変更を保存しますか？</p>
            </div>
            {exchangeRateChanged && (
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                過去レコードは再計算されません。変更は今後の集計から適用されます。
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl font-black text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 transition-all active:scale-95"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl font-black text-white transition-all active:scale-95"
                style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b" }}
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
