"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { StatusBadge } from "@/components/StatusBadge";

type User = { id: string; displayName: string; role: string };
type Request = {
  id: string;
  status: string;
  minutes: number;
  note: string | null;
  rejectReason: string | null;
  requestedAt: string;
  item: { name: string; category: string };
  user: { id: string; displayName: string };
};

export default function RequestsPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [filterUser, setFilterUser] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    setMe(meData);

    const params = new URLSearchParams();
    if (filterUser) params.set("userId", filterUser);
    if (filterStatus) params.set("status", filterStatus);

    const res = await fetch(`/api/requests?${params}`);
    if (res.ok) setRequests(await res.json());
  }, [router, filterUser, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isParent = me?.role === "approver" || me?.role === "admin";
  const isApprover = me?.role === "approver";

  const handleApprove = async (id: string) => {
    await fetch(`/api/requests/${id}/approve`, { method: "PUT" });
    fetchData();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("否決理由を入力してください");
    if (!reason) return;
    await fetch(`/api/requests/${id}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectReason: reason }),
    });
    fetchData();
  };

  if (!me) return null;

  return (
    <div className="lg:pl-64 min-h-screen">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8">
        <h1 className="text-2xl font-display mb-6 mt-2" style={{ color: "var(--expo-blue)" }}>もうしこみ</h1>

        {isParent && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            >
              <option value="">全ステータス</option>
              <option value="pending">承認待ち</option>
              <option value="approved">承認</option>
              <option value="rejected">否決</option>
              <option value="settled">集計済み</option>
            </select>
          </div>
        )}

        <div className="space-y-2">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {isParent && (
                    <p className="text-xs font-bold text-[#1E3A5F] mb-1">{req.user.displayName}</p>
                  )}
                  <p className="font-medium text-gray-800">{req.item.name}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: req.minutes >= 0 ? "#059669" : "#DC2626" }}>
                    {req.minutes >= 0 ? "+" : ""}{req.minutes}分
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(req.requestedAt).toLocaleString("ja-JP")}
                  </p>
                  {req.note && <p className="text-xs text-gray-600 mt-1">メモ: {req.note}</p>}
                  {req.rejectReason && (
                    <p className="text-xs text-red-600 mt-1">否決理由: {req.rejectReason}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={req.status} />
                  {isApprover && req.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-bold min-h-[44px] hover:bg-blue-700"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-bold min-h-[44px] hover:bg-red-700"
                      >
                        否決
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">申請がありません</p>
          )}
        </div>
      </main>
    </div>
  );
}
