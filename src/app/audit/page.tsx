"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";

type User = { id: string; displayName: string; role: string };
type AuditEntry = {
  id: string;
  actorId: string;
  actor: { id: string; displayName: string };
  action: string;
  targetType: string;
  targetId: string;
  diff: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "request.approve": { label: "OK", color: "var(--expo-blue)" },
  "request.reject":  { label: "やりなおし", color: "var(--expo-red)" },
  "request.undo":    { label: "取消", color: "var(--expo-yellow)" },
  "settlement.run":  { label: "週次集計", color: "var(--expo-blue)" },
  "comment.delete":  { label: "コメント削除", color: "#6b7280" },
  "attachment.delete": { label: "添付削除", color: "#6b7280" },
};

export default function AuditPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    setMe(meData);

    if (meData.role !== "admin") {
      router.push("/home");
      return;
    }

    const logsRes = await fetch("/api/audit");
    if (logsRes.ok) setLogs(await logsRes.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    window.location.href = "/api/audit/export";
  };

  if (!me || me.role !== "admin") return null;

  return (
    <div className="lg:pl-64 min-h-screen">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-display" style={{ color: "var(--expo-blue)" }}>監査ログ</h1>
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 min-h-[44px] hover:bg-gray-50"
          >
            CSVエクスポート
          </button>
        </div>

        {loading && (
          <p className="text-center text-gray-400 text-sm py-8">読み込み中...</p>
        )}

        <div className="space-y-2">
          {logs.map((log) => {
            const cfg = ACTION_LABELS[log.action] ?? { label: log.action, color: "#6b7280" };
            return (
              <div key={log.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black text-white"
                        style={{ background: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-xs font-bold text-gray-500">
                        {log.actor.displayName}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-700">
                      {log.targetType} / {log.targetId.slice(0, 8)}...
                    </p>
                    {log.diff && (
                      <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                        {log.diff}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(log.createdAt).toLocaleString("ja-JP")}
                  </span>
                </div>
              </div>
            );
          })}
          {!loading && logs.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-12">ログがありません</p>
          )}
        </div>
      </main>
    </div>
  );
}
