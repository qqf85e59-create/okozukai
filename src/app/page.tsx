"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 万博風のロゴSVG（ミャクミャクの細胞と水のモチーフ）
function ExpoLogo({ size = 90 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label="EXPO 2025 ロゴモチーフ" className="myaku-blob overflow-visible">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(230,0,18,0.3)" />
        </filter>
      </defs>
      
      {/* 水の要素（青） */}
      <circle cx="40" cy="55" r="30" fill="var(--expo-blue, #0068B7)" opacity="0.9" />
      <circle cx="70" cy="65" r="20" fill="var(--expo-blue, #0068B7)" opacity="0.8" />
      
      {/* 細胞の要素（赤） - 有機的に繋がるリング状 */}
      <path d="M50 15 C75 15, 90 35, 85 60 C80 85, 55 90, 35 80 C15 70, 10 40, 25 25 C35 15, 45 15, 50 15 Z" 
            fill="none" stroke="var(--expo-red, #E60012)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" filter="url(#shadow)" />
      
      {/* 目玉モチーフ（いのち） */}
      <circle cx="25" cy="40" r="9" fill="white" />
      <circle cx="25" cy="40" r="4" fill="var(--expo-blue)" />
      
      <circle cx="55" cy="25" r="7" fill="white" />
      <circle cx="55" cy="25" r="3" fill="var(--expo-blue)" />

      <circle cx="80" cy="55" r="10" fill="white" />
      <circle cx="80" cy="55" r="4.5" fill="var(--expo-blue)" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      if (!res.ok) {
        let msg = "ログインに失敗しました";
        try {
          const data = await res.json();
          msg = data.error ?? msg;
        } catch {
          if (res.status === 401) msg = "IDまたはパスワードが違います";
          else if (res.status === 400) msg = "IDとパスワードを入力してください";
          else msg = `サーバーエラー (${res.status})`;
        }
        setError(msg);
        return;
      }

      const data = await res.json();
      if (data.user.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/home");
      }
    } catch {
      setError("サーバーに接続できません。しばらく待ってからもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-expo-room relative overflow-hidden">
      
      {/* 背景の浮遊する水滴・細胞 (CSS Blob) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-[var(--expo-red)] myaku-blob blur-3xl mix-blend-multiply" />
        <div className="absolute top-[60%] left-[70%] w-80 h-80 bg-[var(--expo-blue)] myaku-blob blur-3xl mix-blend-multiply" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[80%] left-[10%] w-48 h-48 bg-[var(--expo-red)] myaku-blob blur-3xl mix-blend-multiply" style={{ animationDelay: '-2s' }} />
      </div>

      <div className="w-full max-w-xs relative z-10">
        {/* EXPO ロゴ */}
        <div className="flex justify-center mb-8">
          <ExpoLogo size={100} />
        </div>

        {/* タイトル */}
        <div className="text-center mb-8">
          <h1
            className="font-display text-4xl tracking-wider"
            style={{ color: "var(--expo-red)", textShadow: "0 2px 10px rgba(230,0,18,0.2)" }}
          >
            おこづかいアプリ
          </h1>
          <p className="text-sm mt-2 font-bold tracking-widest text-gray-600">
            家族のおこづかい管理
          </p>
        </div>

        {/* ログインカード */}
        <div
          className="rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-100"
          style={{ boxShadow: "0 20px 40px rgba(0,104,183,0.1)" }}
        >
          {/* カードヘッダー */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: "var(--expo-light-blue)" }}
          >
            <span
              className="font-display text-lg tracking-wide"
              style={{ color: "var(--expo-blue)" }}
            >
              LOGIN
            </span>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full myaku-blob bg-[var(--expo-red)]" />
              <div className="w-3 h-3 rounded-full myaku-blob bg-[var(--expo-blue)]" style={{ animationDelay: '-1s' }} />
            </div>
          </div>

          {/* カードボディ */}
          <div className="px-6 py-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-xs font-black mb-2 tracking-wider"
                  style={{ color: "var(--expo-dark)" }}
                >
                  ID
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  required
                  autoComplete="username webauthn"
                  id="login-username"
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold min-h-[50px] transition-all bg-gray-50 border-2 border-transparent focus:bg-white"
                  style={{ color: "var(--expo-dark)" }}
                  placeholder="IDを入力"
                  onFocus={(e) => (e.target.style.borderColor = "var(--expo-blue)")}
                  onBlur={(e) => (e.target.style.borderColor = "transparent")}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-black mb-2 tracking-wider"
                  style={{ color: "var(--expo-dark)" }}
                >
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  id="login-password"
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold min-h-[50px] transition-all bg-gray-50 border-2 border-transparent focus:bg-white"
                  style={{ color: "var(--expo-dark)" }}
                  placeholder="パスワードを入力"
                  onFocus={(e) => (e.target.style.borderColor = "var(--expo-blue)")}
                  onBlur={(e) => (e.target.style.borderColor = "transparent")}
                />
              </div>

              {error && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-start gap-3"
                  style={{ background: "#FEF2F2" }}
                >
                  <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black mt-0.5 bg-[var(--expo-red)]">
                    !
                  </div>
                  <p className="text-sm font-bold text-[var(--expo-red)]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                id="login-submit"
                className="w-full rounded-full font-display tracking-widest text-base min-h-[56px] transition-all disabled:opacity-60 pulse-beat shadow-lg"
                style={{
                  background: loading ? "#9CA3AF" : "linear-gradient(135deg, var(--expo-red) 0%, #ff4b5c 100%)",
                  color: "white",
                  transform: loading ? "translateY(2px)" : "translateY(0)",
                }}
              >
                {loading ? "認証中..." : "ログイン"}
              </button>
            </form>
          </div>
        </div>

        {/* 商標注記 */}
        <p className="text-center text-[10px] mt-8 opacity-40 leading-relaxed font-medium">
          本アプリは家庭内私的利用のみを目的とした参照実装です。<br/>
          2025年日本国際博覧会（大阪・関西万博）および公式キャラクターの<br/>デザインを着想元としていますが、公式・商業利用は意図しません。
        </p>
      </div>
    </div>
  );
}
