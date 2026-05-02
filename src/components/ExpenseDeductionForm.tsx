"use client";

import { useState } from "react";

type User = { id: string; displayName: string };

type Props = {
  children: User[];
  onSuccess: () => void;
};

export function ExpenseDeductionForm({ children, onSuccess }: Props) {
  const [userId, setUserId] = useState(children[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/expense-deductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: Number(amount), reason }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "エラーが発生しました");
      return;
    }

    setAmount("");
    setReason("");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-gray-800">実費控除を登録</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">対象の子供</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base min-h-[44px]"
        >
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.displayName}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">金額（円）</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
          placeholder="例: 500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">控除理由（必須）</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
          placeholder="例: コンビニでお菓子購入"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#9333EA] text-white rounded-lg font-bold min-h-[44px] disabled:opacity-50 hover:bg-purple-700 transition-colors"
      >
        {loading ? "登録中..." : "即時控除する"}
      </button>
    </form>
  );
}
