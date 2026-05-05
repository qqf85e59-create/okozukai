"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { BookOpen } from "lucide-react";

type Me = { id: string; displayName: string; role: string };

export default function StudyLogNewPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [minutes, setMinutes] = useState("");
  const [studiedAt, setStudiedAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { router.push("/"); return; }
      const data = await res.json();
      if (data.role !== "child") { router.push("/home"); return; }
      setMe(data);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!minutes || Number(minutes) <= 0) return;
    setSaving(true);
    const res = await fetch("/api/study-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes: Number(minutes), studiedAt, note: note.trim() || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/requests");
    } else {
      setToast("送信に失敗しました");
    }
  }

  if (!me) return null;

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--expo-blue)" }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>勉強時間を申請</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow space-y-5" style={{ border: "2px solid var(--expo-light-blue)" }}>
          <div>
            <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-blue)" }}>
              勉強した時間（分）<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="600"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              required
              placeholder="例: 60"
              className="w-full rounded-2xl px-4 py-3 text-lg font-black bg-gray-50 dark:bg-gray-800 focus:outline-none"
              style={{ border: "2px solid var(--expo-light-blue)" }}
            />
          </div>

          <div>
            <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-blue)" }}>勉強した日</label>
            <input
              type="date"
              value={studiedAt}
              onChange={(e) => setStudiedAt(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 font-bold bg-gray-50 dark:bg-gray-800 focus:outline-none"
              style={{ border: "2px solid #e5e7eb" }}
            />
          </div>

          <div>
            <label className="block text-sm font-black mb-2 text-gray-500">メモ（任意）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="何を勉強したか書いてもいいよ"
              rows={3}
              className="w-full rounded-2xl px-4 py-3 text-sm font-bold bg-gray-50 dark:bg-gray-800 resize-none focus:outline-none"
              style={{ border: "2px solid #e5e7eb" }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-2xl font-black text-gray-500"
              style={{ border: "2px solid #d1d5db" }}
            >
              もどる
            </button>
            <button
              type="submit"
              disabled={saving || !minutes}
              className="flex-1 py-3 rounded-2xl font-black text-white disabled:opacity-50 transition-all active:scale-95"
              style={{ background: "var(--expo-blue)" }}
            >
              {saving ? "おくっています..." : "申請する"}
            </button>
          </div>
        </form>
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
