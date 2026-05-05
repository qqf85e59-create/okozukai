"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { Save, ArrowLeft } from "lucide-react";

type ChoreOverride = {
  choreItemId: string;
  category: string;
  name: string;
  defaultMinutes: number;
  overrideMinutes: number | null;
  active: boolean;
};

type PenaltyOverride = {
  penaltyItemId: string;
  name: string;
  defaultMinutes: number;
  overrideMinutes: number | null;
  active: boolean;
};

type Me = { id: string; displayName: string; role: string };

export default function UserOverridesPage() {
  const router = useRouter();
  const { id: userId } = useParams<{ id: string }>();

  const [me, setMe] = useState<Me | null>(null);
  const [targetName, setTargetName] = useState("");
  const [tab, setTab] = useState<"chore" | "penalty">("chore");
  const [choreOvs, setChoreOvs] = useState<ChoreOverride[]>([]);
  const [penaltyOvs, setPenaltyOvs] = useState<PenaltyOverride[]>([]);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    if (meData.role !== "admin") { router.push("/home"); return; }
    setMe(meData);

    const [usersRes, ovRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch(`/api/admin/users/${userId}/overrides`),
    ]);

    if (usersRes.ok) {
      const users = await usersRes.json();
      const target = users.find((u: { id: string; displayName: string }) => u.id === userId);
      if (target) setTargetName(target.displayName);
    }

    if (ovRes.ok) {
      const data = await ovRes.json();
      setChoreOvs(data.choreOverrides ?? []);
      setPenaltyOvs(data.penaltyOverrides ?? []);
    }
  }, [router, userId]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${userId}/overrides`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choreOverrides: choreOvs.map((o) => ({ choreItemId: o.choreItemId, overrideMinutes: o.overrideMinutes, active: o.active })),
        penaltyOverrides: penaltyOvs.map((o) => ({ penaltyItemId: o.penaltyItemId, overrideMinutes: o.overrideMinutes, active: o.active })),
      }),
    });
    setSaving(false);
    if (res.ok) showToast("保存しました");
  }

  function updateChore(idx: number, field: "overrideMinutes" | "active", value: number | null | boolean) {
    setChoreOvs((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  }

  function updatePenalty(idx: number, field: "overrideMinutes" | "active", value: number | null | boolean) {
    setPenaltyOvs((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  }

  const choreCategories = Array.from(new Set(choreOvs.map((o) => o.category)));

  if (!me) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/users")} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>
            {targetName} の個別設定
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("chore")}
            className={`px-4 py-2 rounded-xl font-black text-sm transition-colors ${tab === "chore" ? "text-white" : "text-gray-500 bg-white dark:bg-gray-900"}`}
            style={tab === "chore" ? { background: "var(--expo-blue)" } : { border: "2px solid #e5e7eb" }}
          >
            おてつだい・べんきょう
          </button>
          <button
            onClick={() => setTab("penalty")}
            className={`px-4 py-2 rounded-xl font-black text-sm transition-colors ${tab === "penalty" ? "text-white" : "text-gray-500 bg-white dark:bg-gray-900"}`}
            style={tab === "penalty" ? { background: "var(--expo-red)" } : { border: "2px solid #e5e7eb" }}
          >
            ペナルティ
          </button>
        </div>

        {tab === "chore" && (
          <div className="space-y-4">
            {choreCategories.map((cat) => (
              <section key={cat}>
                <h2 className="font-black text-sm text-gray-500 mb-2 tracking-widest">{cat}</h2>
                <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow divide-y divide-gray-100 dark:divide-gray-800" style={{ border: "2px solid #e5e7eb" }}>
                  {choreOvs.filter((o) => o.category === cat).map((ov) => {
                    const idx = choreOvs.indexOf(ov);
                    return (
                      <div key={ov.choreItemId} className={`px-4 py-3 flex items-center gap-3 ${!ov.active ? "opacity-40" : ""}`}>
                        <button
                          onClick={() => updateChore(idx, "active", !ov.active)}
                          className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${ov.active ? "" : "bg-gray-200 dark:bg-gray-700"}`}
                          style={ov.active ? { background: "var(--expo-blue)" } : {}}
                          title={ov.active ? "有効（クリックで無効化）" : "無効（クリックで有効化）"}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${ov.active ? "right-1" : "left-1"}`} />
                        </button>
                        <span className="flex-1 text-sm font-bold text-gray-800 dark:text-gray-100">{ov.name}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0"
                            value={ov.overrideMinutes ?? ""}
                            onChange={(e) => updateChore(idx, "overrideMinutes", e.target.value === "" ? null : Number(e.target.value))}
                            placeholder={String(ov.defaultMinutes)}
                            className="w-20 rounded-xl px-2 py-1.5 text-sm font-bold text-right bg-gray-50 dark:bg-gray-800"
                            style={{ border: "2px solid #e5e7eb" }}
                          />
                          <span className="text-xs text-gray-400 font-bold">分</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === "penalty" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow divide-y divide-gray-100 dark:divide-gray-800" style={{ border: "2px solid #fca5a5" }}>
            {penaltyOvs.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">項目がありません</p>
            )}
            {penaltyOvs.map((ov, idx) => (
              <div key={ov.penaltyItemId} className={`px-4 py-3 flex items-center gap-3 ${!ov.active ? "opacity-40" : ""}`}>
                <button
                  onClick={() => updatePenalty(idx, "active", !ov.active)}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${ov.active ? "" : "bg-gray-200 dark:bg-gray-700"}`}
                  style={ov.active ? { background: "var(--expo-red)" } : {}}
                  title={ov.active ? "有効（クリックで無効化）" : "無効（クリックで有効化）"}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${ov.active ? "right-1" : "left-1"}`} />
                </button>
                <span className="flex-1 text-sm font-bold text-gray-800 dark:text-gray-100">{ov.name}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="1"
                    value={ov.overrideMinutes ?? ""}
                    onChange={(e) => updatePenalty(idx, "overrideMinutes", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder={String(ov.defaultMinutes)}
                    className="w-20 rounded-xl px-2 py-1.5 text-sm font-bold text-right bg-gray-50 dark:bg-gray-800"
                    style={{ border: "2px solid #fca5a5" }}
                  />
                  <span className="text-xs text-gray-400 font-bold">分</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-white shadow"
            style={{ background: tab === "chore" ? "var(--expo-blue)" : "var(--expo-red)" }}
          >
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
