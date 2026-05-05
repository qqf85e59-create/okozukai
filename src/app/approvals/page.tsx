"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { BookOpen, ClipboardList, Check, X } from "lucide-react";

type Me = { id: string; displayName: string; role: string };

type StudyLog = {
  id: string;
  minutes: number;
  studiedAt: string;
  note: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
};

type ChoreClaim = {
  id: string;
  totalMinutes: number;
  count: number;
  performedAt: string;
  note: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
  choreItem: { id: string; name: string; category: string };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [choreClaims, setChoreClaims] = useState<ChoreClaim[]>([]);
  const [toast, setToast] = useState("");

  // 棄却モーダル
  const [rejectTarget, setRejectTarget] = useState<{ type: "study" | "chore"; id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    if (meData.role !== "approver" && meData.role !== "admin") { router.push("/home"); return; }
    setMe(meData);

    const [sRes, cRes] = await Promise.all([
      fetch("/api/study-logs?status=PENDING"),
      fetch("/api/chore-claims?status=PENDING"),
    ]);
    if (sRes.ok) setStudyLogs(await sRes.json());
    if (cRes.ok) setChoreClaims(await cRes.json());
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(type: "study" | "chore", id: string) {
    setActing(true);
    const url = type === "study"
      ? `/api/study-logs/${id}/approve`
      : `/api/chore-claims/${id}/approve`;
    const res = await fetch(url, { method: "PUT" });
    setActing(false);
    if (res.ok) {
      showToast("承認しました");
      load();
    } else {
      showToast("承認に失敗しました");
    }
  }

  async function handleRejectSubmit() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActing(true);
    const url = rejectTarget.type === "study"
      ? `/api/study-logs/${rejectTarget.id}/reject`
      : `/api/chore-claims/${rejectTarget.id}/reject`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectedReason: rejectReason.trim() }),
    });
    setActing(false);
    if (res.ok) {
      setRejectTarget(null);
      setRejectReason("");
      showToast("否決しました");
      load();
    } else {
      showToast("否決に失敗しました");
    }
  }

  const total = studyLogs.length + choreClaims.length;

  if (!me) return null;

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between mt-2">
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>承認待ち</h1>
          {total > 0 && (
            <span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "var(--expo-red)" }}>
              {total}件
            </span>
          )}
        </div>

        {/* 勉強時間 */}
        {studyLogs.length > 0 && (
          <section>
            <h2 className="font-black text-sm tracking-widest text-gray-500 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> 勉強時間
            </h2>
            <div className="space-y-2">
              {studyLogs.map((log) => (
                <div key={log.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm" style={{ border: "2px solid #e5e7eb" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black mb-1" style={{ color: "var(--expo-blue)" }}>{log.user.displayName}</p>
                      <p className="font-black text-gray-800 dark:text-gray-100">{log.minutes}分</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.studiedAt)}</p>
                      {log.note && <p className="text-xs text-gray-500 mt-1">{log.note}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove("study", log.id)}
                        disabled={acting}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl font-black text-white text-xs disabled:opacity-50 transition-all active:scale-95"
                        style={{ background: "#10b981" }}
                      >
                        <Check className="w-3.5 h-3.5" /> 承認
                      </button>
                      <button
                        onClick={() => { setRejectTarget({ type: "study", id: log.id }); setRejectReason(""); }}
                        disabled={acting}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl font-black text-white text-xs disabled:opacity-50 transition-all active:scale-95"
                        style={{ background: "#ef4444" }}
                      >
                        <X className="w-3.5 h-3.5" /> 否決
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* おてつだい */}
        {choreClaims.length > 0 && (
          <section>
            <h2 className="font-black text-sm tracking-widest text-gray-500 mb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> おてつだい
            </h2>
            <div className="space-y-2">
              {choreClaims.map((claim) => (
                <div key={claim.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm" style={{ border: "2px solid #e5e7eb" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black mb-1" style={{ color: "var(--expo-blue)" }}>{claim.user.displayName}</p>
                      <p className="font-black text-gray-800 dark:text-gray-100">{claim.choreItem.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">×{claim.count} → +{claim.totalMinutes}分</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(claim.performedAt)}</p>
                      {claim.note && <p className="text-xs text-gray-500 mt-1">{claim.note}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove("chore", claim.id)}
                        disabled={acting}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl font-black text-white text-xs disabled:opacity-50 transition-all active:scale-95"
                        style={{ background: "#10b981" }}
                      >
                        <Check className="w-3.5 h-3.5" /> 承認
                      </button>
                      <button
                        onClick={() => { setRejectTarget({ type: "chore", id: claim.id }); setRejectReason(""); }}
                        disabled={acting}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl font-black text-white text-xs disabled:opacity-50 transition-all active:scale-95"
                        style={{ background: "#ef4444" }}
                      >
                        <X className="w-3.5 h-3.5" /> 否決
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {total === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--expo-light-blue)" }}>
              <Check className="w-8 h-8" style={{ color: "var(--expo-blue)" }} />
            </div>
            <p className="font-black text-gray-500">承認待ちの申請はありません</p>
          </div>
        )}
      </main>

      {/* 否決モーダル */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "2px solid #e5e7eb" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "#ef4444" }}>
              <p className="font-display text-white text-base">否決理由</p>
              <button onClick={() => setRejectTarget(null)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="否決の理由を入力してください（必須）"
                rows={3}
                autoFocus
                className="w-full rounded-2xl px-4 py-3 text-sm font-bold bg-gray-50 dark:bg-gray-800 resize-none focus:outline-none"
                style={{ border: "2px solid #e5e7eb" }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 py-3 rounded-2xl font-black text-gray-500 text-sm"
                  style={{ border: "2px solid #d1d5db" }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={acting || !rejectReason.trim()}
                  className="flex-1 py-3 rounded-2xl font-black text-white text-sm disabled:opacity-50 transition-all active:scale-95"
                  style={{ background: "#ef4444" }}
                >
                  {acting ? "送信中..." : "否決する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
