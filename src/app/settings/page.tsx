"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Check } from "lucide-react";
import { useConcept, type Concept } from "@/components/ConceptThemeProvider";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES, type ThemeId } from "@/themes/registry";

type User = { id: string; displayName: string; role: string };

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const { concept, setConcept } = useConcept();
  const { themeId, setThemeId } = useTheme();
  const [theme, setTheme] = useState<"auto" | "light" | "dark">("auto");
  const [fontScale, setFontScale] = useState("1");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/"); return; }
      setMe(await meRes.json());
    })();

    // Load saved preferences
    const savedTheme = localStorage.getItem("okozukai-theme") as "auto" | "light" | "dark" | null;
    if (savedTheme) setTheme(savedTheme);

    const savedScale = localStorage.getItem("okozukai-fontscale");
    if (savedScale) setFontScale(savedScale);

    // Check push subscription
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
        });
      });
    }
  }, [router]);

  const handleThemeChange = (newTheme: "auto" | "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("okozukai-theme", newTheme);
    if (newTheme === "auto") {
      document.documentElement.removeAttribute("data-color-scheme");
    } else {
      document.documentElement.setAttribute("data-color-scheme", newTheme);
    }
  };

  const handleFontScale = (scale: string) => {
    setFontScale(scale);
    localStorage.setItem("okozukai-fontscale", scale);
    document.documentElement.style.setProperty("--font-scale", scale);
  };

  const handlePushToggle = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("このブラウザはプッシュ通知に対応していません");
      return;
    }

    setPushLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;

      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        setPushEnabled(false);
      } else {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          alert("VAPID キーが設定されていません");
          setPushLoading(false);
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        const subJSON = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            p256dh: subJSON.keys?.p256dh,
            auth: subJSON.keys?.auth,
            userAgent: navigator.userAgent,
          }),
        });
        setPushEnabled(true);
      }
    } catch (err) {
      console.error("Push toggle error:", err);
      alert("通知設定の変更に失敗しました");
    } finally {
      setPushLoading(false);
    }
  }, [pushEnabled]);

  const handleTestPush = async () => {
    await fetch("/api/push/test", { method: "POST" });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleBackup = () => {
    window.location.href = "/api/backup/export";
  };

  if (!me) return null;

  const isAdmin = me.role === "admin";

  return (
    <div className="lg:pl-64 min-h-screen">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-display mt-2" style={{ color: "var(--expo-blue)" }}>設定</h1>

        {/* デザインコンセプト */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-black text-gray-800 dark:text-gray-100 mb-1">デザインテーマ</h2>
          <p className="text-xs text-gray-400 dark:text-gray-400 mb-4">アプリ全体の見た目を切り替えます</p>
          <div className="space-y-3">
            {([
              {
                value: "workshop" as Concept,
                name: "Workshop",
                nameJp: "工房・木目",
                desc: "ナチュラルで温かみのあるデザイン（デフォルト）",
                preview: { bg: "oklch(0.96 0.01 70)", accent: "oklch(0.55 0.13 40)", border: "oklch(0.7 0.03 70)" },
              },
              {
                value: "cosmic" as Concept,
                name: "Cosmic Vault",
                nameJp: "宇宙×銀行",
                desc: "深宇宙・ホログラム・ネオンアクセント",
                preview: { bg: "oklch(0.16 0.04 270)", accent: "oklch(0.78 0.18 195)", border: "oklch(0.45 0.05 270 / 0.6)" },
              },
              {
                value: "pixel" as Concept,
                name: "Pixel Quest",
                nameJp: "8bitゲーム",
                desc: "レトロゲーム風・コインとクエスト",
                preview: { bg: "#0c0e1a", accent: "#ffd83d", border: "#3d4577" },
              },
            ] as const).map((opt) => {
              const active = concept === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setConcept(opt.value)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.99] text-left"
                  style={{
                    border: active ? `2px solid var(--expo-blue)` : "2px solid #e5e7eb",
                    background: active ? "var(--expo-light-blue)" : "#fafafa",
                  }}
                >
                  {/* ミニプレビュー */}
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
                    style={{ background: opt.preview.bg, border: `2px solid ${opt.preview.border}`, color: opt.preview.accent }}
                  >
                    {opt.value === "cosmic" ? "✦" : opt.value === "pixel" ? "▶" : "❧"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-800 dark:text-gray-100">{opt.name}</span>
                      <span className="text-xs text-gray-400">{opt.nameJp}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                  {active && <Check size={18} style={{ color: "var(--expo-blue)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </section>

        {/* 20テーマセレクター */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-black text-gray-800 dark:text-gray-100 mb-1">カラーテーマ</h2>
          <p className="text-xs text-gray-400 mb-4">アプリのカラーパレットを選択します（20種類）</p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.values(THEMES) as typeof THEMES[ThemeId][]).map((t) => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  title={`${t.nameJp} (${t.audience})`}
                  className="relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95"
                  style={{
                    border: active ? `2px solid ${t.colors.primary}` : "2px solid #e5e7eb",
                    background: t.colors.bg,
                  }}
                >
                  <div className="flex gap-0.5">
                    <span className="w-3 h-3 rounded-full" style={{ background: t.colors.primary }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: t.colors.accent }} />
                  </div>
                  <span className="text-[9px] font-bold leading-tight text-center" style={{ color: t.colors.text }}>
                    {t.id.toUpperCase()}
                  </span>
                  {active && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: t.colors.primary }} />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            現在: <span className="font-bold" style={{ color: "var(--color-primary)" }}>{THEMES[themeId].nameJp}</span>（{THEMES[themeId].audience}向け）
          </p>
        </section>

        {/* ライト/ダークモード */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-black text-gray-800 dark:text-gray-100 mb-3">テーマ</h2>
          <div className="flex gap-2">
            {([
              { value: "auto", label: "自動" },
              { value: "light", label: "ライト" },
              { value: "dark", label: "ダーク" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleThemeChange(opt.value)}
                className="flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-95 min-h-[44px]"
                style={
                  theme === opt.value
                    ? { background: "var(--expo-blue)", color: "white", border: "2px solid #0d2d6b" }
                    : { background: "#f3f4f6", color: "#374151", border: "2px solid #e5e7eb" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* フォントサイズ */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-black text-gray-800 dark:text-gray-100 mb-3">フォントサイズ</h2>
          <div className="flex gap-2">
            {([
              { value: "1", label: "標準" },
              { value: "1.15", label: "大" },
              { value: "1.3", label: "特大" },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFontScale(opt.value)}
                className="flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-95 min-h-[44px]"
                style={
                  fontScale === opt.value
                    ? { background: "var(--expo-blue)", color: "white", border: "2px solid #0d2d6b" }
                    : { background: "#f3f4f6", color: "#374151", border: "2px solid #e5e7eb" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* 通知 */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-black text-gray-800 dark:text-gray-100 mb-3">プッシュ通知</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700">
                {pushEnabled ? "通知ON" : "通知OFF"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-300">
                承認・集計の通知を受け取ります
              </p>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={pushLoading}
              className="px-4 py-2 rounded-xl font-black text-sm min-h-[44px] transition-all active:scale-95"
              style={
                pushEnabled
                  ? { background: "#fee2e2", color: "var(--expo-red)", border: "2px solid #fca5a5" }
                  : { background: "var(--expo-green)", color: "white", border: "2px solid #006633" }
              }
            >
              {pushLoading ? "..." : pushEnabled ? "OFF にする" : "ON にする"}
            </button>
          </div>
          {pushEnabled && (
            <button
              onClick={handleTestPush}
              className="mt-3 w-full py-2 rounded-xl font-bold text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 active:scale-95 transition-all"
            >
              {testSent ? <span className="flex items-center justify-center gap-1"><Check size={14} />送信しました</span> : "テスト通知を送る"}
            </button>
          )}
        </section>

        {/* バックアップ（admin のみ）*/}
        {isAdmin && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="font-black text-gray-800 dark:text-gray-100 mb-3">データバックアップ</h2>
            <button
              onClick={handleBackup}
              className="w-full py-3 rounded-xl font-black text-sm text-white min-h-[44px] transition-all active:scale-95"
              style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b" }}
            >
              JSONエクスポート
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-300 mt-2">
              全テーブルのデータをJSON形式でダウンロードします
            </p>
          </section>
        )}

        {/* 注記 */}
        <p className="text-center text-xs opacity-50 pt-4" style={{ color: "var(--foreground)" }}>
          本アプリは家庭内私的利用のみを目的としたオリジナル作品です。
        </p>
      </main>
    </div>
  );
}
