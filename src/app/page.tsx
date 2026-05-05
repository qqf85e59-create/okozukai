"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function AppEmblem({ size = 90 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-3xl relative overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "var(--c-bg-elev-2, linear-gradient(135deg, var(--expo-light-blue), white))",
        border: "3px solid var(--c-border-strong, var(--expo-blue))",
        boxShadow: "var(--c-shadow-pop, 0 20px 40px rgba(0,104,183,0.15))",
      }}
    >
      <span
        className="font-display font-black select-none"
        style={{
          fontSize: size * 0.45,
          color: "var(--c-accent, var(--expo-blue))",
          fontFamily: "var(--font-display-concept, inherit)",
          lineHeight: 1,
        }}
      >
        ❧
      </span>
      <span
        className="concept-starfield absolute inset-0"
        aria-hidden="true"
      />
    </div>
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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--c-grid-bg, var(--background))" }}
    >
      {/* 背景グロー */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div
          className="absolute top-[10%] left-[15%] w-64 h-64 blur-3xl rounded-full"
          style={{ background: "var(--c-accent-2, var(--expo-red))" }}
        />
        <div
          className="absolute top-[60%] left-[70%] w-80 h-80 blur-3xl rounded-full"
          style={{ background: "var(--c-accent, var(--expo-blue))", animationDelay: "-4s" }}
        />
      </div>

      <div className="w-full max-w-xs relative z-10">
        <div className="flex justify-center mb-8">
          <AppEmblem size={100} />
        </div>

        <div className="text-center mb-8">
          <h1
            className="font-display text-4xl tracking-wider"
            style={{
              color: "var(--c-accent, var(--expo-blue))",
              fontFamily: "var(--font-display-concept, inherit)",
            }}
          >
            おこづかいアプリ
          </h1>
          <p className="text-sm mt-2 font-bold tracking-widest" style={{ color: "var(--c-fg-mute, #6b7280)" }}>
            家族のおこづかい管理
          </p>
        </div>

        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "var(--c-surface, white)",
            border: "1px solid var(--c-border, #e5e7eb)",
            boxShadow: "var(--c-shadow-card, 0 20px 40px rgba(0,104,183,0.1))",
          }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: "var(--c-bg-elev-2, var(--expo-light-blue))" }}
          >
            <span
              className="font-display text-lg tracking-wide"
              style={{ color: "var(--c-accent, var(--expo-blue))", fontFamily: "var(--font-display-concept, inherit)" }}
            >
              LOGIN
            </span>
            <div className="flex gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: "var(--c-accent-2, var(--expo-red))" }}
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: "var(--c-accent, var(--expo-blue))" }}
              />
            </div>
          </div>

          <div className="px-6 py-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-xs font-black mb-2 tracking-wider"
                  style={{ color: "var(--c-fg, var(--expo-dark))" }}
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
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold min-h-[50px] transition-all border-2 border-transparent"
                  style={{ background: "var(--c-bg-elev-2, #f9fafb)", color: "var(--c-fg, var(--expo-dark))" }}
                  placeholder="IDを入力"
                  onFocus={(e) => (e.target.style.borderColor = "var(--c-accent, var(--expo-blue))")}
                  onBlur={(e) => (e.target.style.borderColor = "transparent")}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-black mb-2 tracking-wider"
                  style={{ color: "var(--c-fg, var(--expo-dark))" }}
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
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold min-h-[50px] transition-all border-2 border-transparent"
                  style={{ background: "var(--c-bg-elev-2, #f9fafb)", color: "var(--c-fg, var(--expo-dark))" }}
                  placeholder="パスワードを入力"
                  onFocus={(e) => (e.target.style.borderColor = "var(--c-accent, var(--expo-blue))")}
                  onBlur={(e) => (e.target.style.borderColor = "transparent")}
                />
              </div>

              {error && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-start gap-3"
                  style={{ background: "var(--c-bg-elev-2, #fef2f2)" }}
                >
                  <div
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black mt-0.5"
                    style={{ background: "var(--c-danger, var(--expo-red))" }}
                  >
                    !
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--c-danger, var(--expo-red))" }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                id="login-submit"
                className="w-full rounded-full font-display tracking-widest text-base min-h-[56px] transition-all disabled:opacity-60 shadow-lg active:scale-95"
                style={{
                  background: loading
                    ? "var(--c-fg-dim, #9ca3af)"
                    : "linear-gradient(135deg, var(--c-accent, var(--expo-blue)) 0%, var(--c-accent-2, #004d8c) 100%)",
                  color: "white",
                  fontFamily: "var(--font-display-concept, inherit)",
                }}
              >
                {loading ? "認証中..." : "ログイン"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[10px] mt-8 opacity-40 leading-relaxed font-medium" style={{ color: "var(--c-fg, inherit)" }}>
          本アプリは家庭内私的利用のみを目的としたオリジナル作品です。
        </p>
      </div>
    </div>
  );
}
