"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ExpenseDeductionForm } from "@/components/ExpenseDeductionForm";

type User = { id: string; displayName: string; role: string };
type Deduction = {
  id: string;
  amount: number;
  reason: string;
  registeredBy: string;
  createdAt: string;
  user: { id: string; displayName: string };
};

export default function ExpensesPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [children, setChildren] = useState<{ id: string; displayName: string }[]>([]);

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) { router.push("/"); return; }
    const meData = await meRes.json();
    setMe(meData);

    if (meData.role !== "approver" && meData.role !== "admin") {
      router.push("/home");
      return;
    }

    const [deducRes, usersRes] = await Promise.all([
      fetch("/api/expense-deductions"),
      fetch("/api/users"),
    ]);

    if (deducRes.ok) setDeductions(await deducRes.json());
    if (usersRes.ok) {
      const users = await usersRes.json();
      setChildren(users.filter((u: { role: string }) => u.role === "child"));
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("この控除を取り消しますか？")) return;
    await fetch(`/api/expense-deductions/${id}`, { method: "DELETE" });
    fetchData();
  };

  if (!me) return null;

  return (
    <div className="lg:pl-64 min-h-screen">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-display mt-2" style={{ color: "var(--expo-blue)" }}>運営費</h1>

        <ExpenseDeductionForm children={children} onSuccess={fetchData} />

        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">控除履歴</h2>
          <div className="space-y-2">
            {deductions.map((d) => (
              <div key={d.id} className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#9333EA]">{d.user.displayName}</p>
                    <p className="font-bold text-gray-800 text-lg">-{d.amount.toLocaleString()}円</p>
                    <p className="text-sm text-gray-600">{d.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(d.createdAt).toLocaleString("ja-JP")}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="shrink-0 px-3 py-2 text-xs text-red-600 border border-red-300 rounded-lg min-h-[44px] hover:bg-red-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            ))}
            {deductions.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">控除履歴がありません</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
