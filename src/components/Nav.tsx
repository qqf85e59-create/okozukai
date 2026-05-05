"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ClipboardList, BookOpen, Coins, BarChart3, Database, Receipt, LogOut, Settings, Users, Bell, AlertTriangle, ListChecks, Timer, Zap } from "lucide-react";

// 万博風のミニロゴ（ミャクミャクモチーフ）
function ExpoLogoMini() {
  return (
    <svg viewBox="0 0 100 100" width={24} height={24} aria-label="EXPO 2025 ロゴモチーフ" className="myaku-blob overflow-visible">
      <circle cx="40" cy="55" r="30" fill="var(--expo-blue, #0068B7)" opacity="0.9" />
      <circle cx="70" cy="65" r="20" fill="var(--expo-blue, #0068B7)" opacity="0.8" />
      <path d="M50 15 C75 15, 90 35, 85 60 C80 85, 55 90, 35 80 C15 70, 10 40, 25 25 C35 15, 45 15, 50 15 Z" 
            fill="none" stroke="var(--expo-red, #E60012)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="40" r="9" fill="white" />
      <circle cx="25" cy="40" r="4" fill="var(--expo-blue)" />
      <circle cx="55" cy="25" r="7" fill="white" />
      <circle cx="55" cy="25" r="3" fill="var(--expo-blue)" />
    </svg>
  );
}

import { LabelWithGloss } from "@/components/LabelWithGloss";

const NAV_ITEMS = [
  { href: "/home",     main: "ホーム",           gloss: "トップページ",     Icon: Home          },
  { href: "/requests", main: "もうしこみ",       gloss: "申請する",         Icon: ClipboardList },
  { href: "/history",  main: "きろく",           gloss: "申請の記録",       Icon: BookOpen      },
  { href: "/cash",     main: "現金にする",       gloss: "現金化",           Icon: Coins         },
  { href: "/report",   main: "レポート",         gloss: "成績",             Icon: BarChart3     },
  { href: "/convert",  main: "時間を換算",       gloss: "60分→500円",       Icon: Timer         },
  { href: "/cashout",  main: "換金する",         gloss: "現金に換える",     Icon: Coins         },
  { href: "/consume",  main: "時間を使う",       gloss: "消費を記録",       Icon: Zap           },
];

const PARENT_ITEMS = [
  { href: "/home",          main: "ホーム",       gloss: "トップページ",   Icon: Home          },
  { href: "/approvals",     main: "承認待ち",     gloss: "申請を承認",     Icon: Bell          },
  { href: "/penalties/new", main: "ペナルティ",   gloss: "記録する",       Icon: AlertTriangle },
  { href: "/items",         main: "項目設定",     gloss: "おこづかい項目", Icon: Database      },
  { href: "/expenses",      main: "実費控除",     gloss: "費用を引く",     Icon: Receipt       },
  { href: "/history",       main: "きろく",       gloss: "申請の記録",     Icon: BookOpen      },
  { href: "/report",        main: "レポート",     gloss: "成績",           Icon: BarChart3     },
  { href: "/audit",         main: "監査ログ",     gloss: "操作記録",       Icon: Settings      },
];

const ADMIN_ONLY_ITEMS = [
  { href: "/admin/users",          main: "ユーザー管理",  gloss: "管理者設定",   Icon: Users      },
  { href: "/admin/chore-items",    main: "おてつだい項目", gloss: "項目マスタ",  Icon: ListChecks },
  { href: "/admin/penalty-items",  main: "ペナルティ項目", gloss: "項目マスタ",  Icon: AlertTriangle },
];

type Props = {
  role: string;
  displayName: string;
};

export function Nav({ role, displayName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isParent = role === "approver" || role === "admin";
  const isAdmin = role === "admin";
  const items = isAdmin ? [...PARENT_ITEMS, ...ADMIN_ONLY_ITEMS] : isParent ? PARENT_ITEMS : NAV_ITEMS;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <>
      {/* PC: サイドバー */}
      <aside
        className="hidden lg:flex flex-col w-64 min-h-screen fixed left-0 top-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950"
      >
        {/* ロゴエリア */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <ExpoLogoMini />
            <div>
              <h1 className="font-display text-lg leading-tight tracking-wider" style={{ color: "var(--expo-blue)" }}>
                おこづかいアプリ
              </h1>
              <p className="text-[10px] font-bold mt-1 tracking-widest" style={{ color: "var(--expo-red)" }}>
                {displayName}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {items.map(({ href, main, gloss, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${!active ? "dark:text-gray-400 hover:dark:text-gray-200" : ""}`}
                style={
                  active
                    ? { background: "var(--expo-light-blue)", color: "var(--expo-blue)" }
                    : { color: "#64748b" }
                }
              >
                <Icon size={20} className={active ? "opacity-100" : "opacity-70"} />
                <LabelWithGloss main={main} gloss={gloss} />
              </Link>
            );
          })}
        </nav>

        {/* 設定 + ログアウト */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <Link
            href="/settings"
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Settings size={20} className="opacity-70" />
            <span>設定</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <LogOut size={20} className="opacity-70" />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* モバイル: ボトムナビ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800"
      >
        <div className="flex px-1">
          {items.slice(0, 5).map(({ href, main, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center py-2.5 min-h-[64px] transition-colors relative"
                style={active ? { color: "var(--expo-blue)" } : { color: "#94a3b8" }}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-[var(--expo-red)]" />
                )}
                <Icon size={22} className={`mb-1 ${active ? "opacity-100" : "opacity-70"}`} />
                <span className="text-[9px] font-black tracking-wider leading-tight text-center">{main}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
