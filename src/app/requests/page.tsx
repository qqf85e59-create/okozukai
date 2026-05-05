"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { BookOpen, ClipboardList, Plus } from "lucide-react";
import { formatMin } from "@/lib/format";

type Me = { id: string; displayName: string; role: string };

type StudyLog = {
  id: string;
  minutes: number;
  studiedAt: string;
  note: string | null;
  status: string;
  rejectedReason: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
};

type ChoreClaim = {
  id: string;
  totalMinutes: number;
  count: number;
  performedAt: string;
  note: string | null;
  status: string;
  rejectedReason: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
  choreItem: { id: string; name: string; category: string };
};

type PenaltyEvent = {
  id: string;
  totalMinutes: number;
  occurredAt: string;
  reason: string;
  createdAt: string;
  user: { id: string; displayName: string };
  penaltyItem: { id: string; name: string };
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "審査中",   color: "#f59e0b" },
  APPROVED: { label: "承認済み", color: "#10b981" },
  REJECTED: { label: "否決",     color: "#ef4444" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: "#6b7280" };
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export default function RequestsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [choreClaims, setChoreClaims] = useState<ChoreClaim[]>([]);
  const [penaltyEvents, setPenaltyEvents] = useState<PenaltyEvent[]>([]);
  const [toast, setToast] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  async function handleCancelStudyLog(id: string) {
    if (!confirm("この申請をキャンセルしますか？")) return;
    const res = await fetch(`/api/study-logs/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("キャンセルしました"); load(); }
    else { const e = await res.json().catch(() => ({})); showToast(e.error ?? "キャンセルに失敗しました"); }
  }

  async function handleCancelChoreClaim(id: string) {
    if (!confirm("この申請をキャンセルしますか？")) return;
    const res = await fetch(`/api/chore-claims/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("キャンセルしました"); load(); }
    else { const e = await res.json().catch(() => ({})); showToast(e.error ?? "キャンセルに失敗しました"); }
  }

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    setMe(meData);

    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);

    const [sRes, cRes, pRes] = await Promise.all([
      fetch(`/api/study-logs?${params}`),
      fetch(`/api/chore-claims?${params}`),
      fetch("/api/penalty-events"),
    ]);
    if (sRes.ok) setStudyLogs(await sRes.json());
    if (cRes.ok) setChoreClaims(await cRes.json());
    if (pRes.ok) setPenaltyEvents(await pRes.json());
  }, [router, filterStatus]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  const isParent = me?.role === "approver" || me?.role === "admin";
  const isChild = me?.role === "child";

  return (
    <div className="lg:pl-64 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Nav role={me?.role ?? ""} displayName={me?.displayName ?? ""} />
      <main className="p-4 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between mt-2">
          <h1 className="font-display text-2xl" style={{ color: "var(--expo-blue)" }}>もうしこみ</h1>
          {isChild && (
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/study-logs/new")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-white text-xs"
                style={{ background: "var(--expo-blue)" }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                勉強
              </button>
              <button
                onClick={() => router.push("/chore-claims/new")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-white text-xs"
                style={{ background: "var(--expo-blue)" }}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                おてつだい
              </button>
            </div>
          )}
        </div>

        {/* ステータスフィルター（親のみ） */}
        {isParent && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold bg-white dark:bg-gray-900 min-h-[44px]"
          >
            <option value="">全ステータス</option>
            <option value="PENDING">審査中</option>
            <option value="APPROVED">承認済み</option>
            <option value="REJECTED">否決</option>
          </select>
        )}

        {/* 勉強時間申請 */}
        {studyLogs.length > 0 && (
          <section>
            <h2 className="font-black text-sm tracking-widest text-gray-500 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> 勉強時間
            </h2>
            <div className="space-y-2">
              {studyLogs.map((log) => (
                <div key={log.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm" style={{ border: "2px solid #e5e7eb" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isParent && <p className="text-xs font-black mb-1" style={{ color: "var(--expo-blue)" }}>{log.user.displayName}</p>}
                      <p className="font-black text-gray-800 dark:text-gray-100">{formatMin(log.minutes)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.studiedAt)}</p>
                      {log.note && <p className="text-xs text-gray-500 mt-1">{log.note}</p>}
                      {log.rejectedReason && (
                        <p className="text-xs mt-1 font-bold" style={{ color: "var(--expo-red)" }}>否決理由: {log.rejectedReason}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={log.status} />
                      {isChild && log.status === "PENDING" && (
                        <button onClick={() => handleCancelStudyLog(log.id)} className="text-[10px] font-black px-2 py-0.5 rounded text-gray-400 hover:text-red-400 border border-gray-200">
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* おてつだい申請 */}
        {choreClaims.length > 0 && (
          <section>
            <h2 className="font-black text-sm tracking-widest text-gray-500 mb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> おてつだい
            </h2>
            <div className="space-y-2">
              {choreClaims.map((claim) => (
                <div key={claim.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm" style={{ border: "2px solid #e5e7eb" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isParent && <p className="text-xs font-black mb-1" style={{ color: "var(--expo-blue)" }}>{claim.user.displayName}</p>}
                      <p className="font-black text-gray-800 dark:text-gray-100">{claim.choreItem.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">×{claim.count} → +{formatMin(claim.totalMinutes)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(claim.performedAt)}</p>
                      {claim.note && <p className="text-xs text-gray-500 mt-1">{claim.note}</p>}
                      {claim.rejectedReason && (
                        <p className="text-xs mt-1 font-bold" style={{ color: "var(--expo-red)" }}>否決理由: {claim.rejectedReason}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={claim.status} />
                      {isChild && claim.status === "PENDING" && (
                        <button onClick={() => handleCancelChoreClaim(claim.id)} className="text-[10px] font-black px-2 py-0.5 rounded text-gray-400 hover:text-red-400 border border-gray-200">
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ペナルティ */}
        {penaltyEvents.length > 0 && (
          <section>
            <h2 className="font-black text-sm tracking-widest mb-2" style={{ color: "var(--expo-red)" }}>ペナルティ</h2>
            <div className="space-y-2">
              {penaltyEvents.map((ev) => (
                <div key={ev.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm" style={{ border: "2px solid #fca5a5" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isParent && <p className="text-xs font-black mb-1" style={{ color: "var(--expo-red)" }}>{ev.user.displayName}</p>}
                      <p className="font-black text-gray-800 dark:text-gray-100">{ev.penaltyItem.name}</p>
                      <p className="text-xs font-black mt-0.5" style={{ color: "var(--expo-red)" }}>△{ev.totalMinutes}分</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ev.reason}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(ev.occurredAt)}</p>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: "var(--expo-red)" }}>
                      記録済み
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {studyLogs.length === 0 && choreClaims.length === 0 && penaltyEvents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 font-bold">申請がありません</p>
            {isChild && (
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => router.push("/study-logs/new")}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-white text-sm"
                  style={{ background: "var(--expo-blue)" }}
                >
                  <Plus className="w-4 h-4" /> 勉強を申請
                </button>
                <button
                  onClick={() => router.push("/chore-claims/new")}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-white text-sm"
                  style={{ background: "var(--expo-blue)" }}
                >
                  <Plus className="w-4 h-4" /> おてつだいを申請
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
