"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "エラーが発生しました");
      return;
    }

    router.push("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1E3A5F]">パスワードを変更してください</h1>
          <p className="text-gray-500 mt-2 text-sm">初回ログインのため、新しいパスワードを設定してください</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（6文字以上）</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">確認</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>

            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E3A5F] text-white rounded-lg font-bold text-base min-h-[44px] disabled:opacity-50"
            >
              {loading ? "変更中..." : "変更して続ける"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
