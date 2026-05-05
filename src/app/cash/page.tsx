"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { StatusBadge } from "@/components/StatusBadge";

type User = { id: string; displayName: string; role: string };
type CashRequest = {
  id: string;
  amount: number;
  fee: number;
  status: string;
  rejectReason: string | null;
  requestedAt: string;
  paidAt: string | null;
  user: { id: string; displayName: string };
};
type Balance = { virtualAmount: number };

export default function CashPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [cashRequests, setCashRequests] = useState<CashRequest[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    setMe(meData);

    const [crRes] = await Promise.all([fetch("/api/cash-requests")]);
    if (crRes.ok) setCashRequests(await crRes.json());

    if (meData.role === "child") {
      const balRes = await fetch(`/api/balance/${meData.id}`);
      if (balRes.ok) setBalance((await balRes.json()).balance);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isParent = me?.role === "approver" || me?.role === "admin";

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/cash-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "現金化申請: エラーが発生しました");
      return;
    }
    setAmount("");
    fetchData();
  };

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/cash-requests/${id}/approve`, { method: "PUT" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "現金化承認: エラーが発生しました");
      return;
    }
    setError("");
    fetchData();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("否決理由を入力してください");
    if (!reason) return;
    const res = await fetch(`/api/cash-requests/${id}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectReason: reason }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "現金化否決: エラーが発生しました");
      return;
    }
    setError("");
    fetchData();
  };

  const handlePaid = async (id: string) => {
    await fetch(`/api/cash-requests/${id}/paid`, { method: "PUT" });
    fetchData();
  };

  if (!me) return null;

  return (
    <div className="lg:pl-64 min-h-screen">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-display" style={{ color: "var(--expo-blue)" }}>現金にする</h1>

        {!isParent && balance && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">現在の残高</p>
            <p className={`text-2xl font-bold ${balance.virtualAmount < 0 ? "text-red-700" : "text-[#1E3A5F]"}`}>
              {balance.virtualAmount.toLocaleString("ja-JP")}円
            </p>
            {balance.virtualAmount < 0 && (
              <p className="text-sm text-red-600 mt-1">借金中は現金化申請できません</p>
            )}

            {balance.virtualAmount >= 0 && (
              <form onSubmit={handleRequest} className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    申請額（500円単位、手数料500円別途）
                  </label>
                  <select
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base min-h-[44px]"
                  >
                    <option value="">選択してください</option>
                    {[500, 1000, 1500, 2000, 2500, 3000, 4000, 5000].map((v) => (
                      <option key={v} value={v}>{v.toLocaleString()}円（手数料込み {(v + 500).toLocaleString()}円必要）</option>
                    ))}
                  </select>
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#7C3AED] text-white rounded-lg font-bold min-h-[44px] disabled:opacity-50 hover:bg-purple-700"
                >
                  {loading ? "申請中..." : "現金化を申請"}
                </button>
              </form>
            )}
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">現金化申請一覧</h2>
          <div className="space-y-2">
            {cashRequests.map((cr) => (
              <div key={cr.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {isParent && <p className="text-xs font-bold text-[#1E3A5F] mb-1">{cr.user.displayName}</p>}
                    <p className="font-bold text-[#7C3AED] text-lg">{cr.amount.toLocaleString()}円</p>
                    <p className="text-xs text-gray-500">手数料: {cr.fee}円</p>
                    <p className="text-xs text-gray-500">{new Date(cr.requestedAt).toLocaleString("ja-JP")}</p>
                    {cr.rejectReason && <p className="text-xs text-red-600 mt-1">否決理由: {cr.rejectReason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={cr.status} />
                    {isParent && cr.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(cr.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-bold min-h-[44px]">承認</button>
                        <button onClick={() => handleReject(cr.id)} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-bold min-h-[44px]">否決</button>
                      </div>
                    )}
                    {isParent && cr.status === "approved" && (
                      <button onClick={() => handlePaid(cr.id)} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg font-bold min-h-[44px]">支払済み</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {cashRequests.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">現金化申請がありません</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
