"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ClipboardList, BookOpen, Coins, BarChart3, Database, Receipt, LogOut, Settings, Users, Bell, AlertTriangle, ListChecks, Timer, Zap } from "lucide-react";
import { useConcept } from "@/components/ConceptThemeProvider";
import { COPY } from "@/lib/copy";

function ConceptEmblem({ concept }: { concept: string }) {
  if (concept === "cosmic") {
    return (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-black shrink-0"
        style={{ background: "var(--c-bg-elev-2, #1f2440)", color: "var(--c-accent, #06b6d4)", border: "1px solid var(--c-border, #3d4577)" }}
      >
        ✦
      </div>
    );
  }
  if (concept === "pixel") {
    return (
      <div
        className="w-8 h-8 flex items-center justify-center text-base font-black shrink-0"
        style={{ background: "var(--c-bg-elev-2, #1f2440)", color: "var(--c-accent, #ffd83d)", border: "2px solid var(--c-border-strong, #5a64a8)" }}
      >
        ▶
      </div>
    );
  }
  if (concept === "arcade") {
    return (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black shrink-0"
        style={{ background: "var(--c-accent, oklch(0.78 0.22 30))", color: "white", border: "2px solid oklch(0.2 0.05 320)", boxShadow: "0 3px 0 oklch(0.5 0.18 30)" }}
      >
        ★
      </div>
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-black shrink-0"
      style={{ background: "var(--c-bg-elev-2, #f3ede4)", color: "var(--c-accent, var(--expo-blue))", border: "1px solid var(--c-border, oklch(0.7 0.03 70))" }}
    >
      ❧
    </div>
  );
}

type Props = {
  role: string;
  displayName: string;
};

export function Nav({ role, displayName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { concept } = useConcept();
  const copy = COPY[concept];

  const isParent = role === "approver" || role === "admin";
  const isAdmin = role === "admin";

  const NAV_ITEMS = [
    { href: "/home",     label: copy.home,     Icon: Home },
    { href: "/requests", label: copy.missions, Icon: ClipboardList },
    { href: "/history",  label: copy.history,  Icon: BookOpen },
    { href: "/cash",     label: copy.cash,     Icon: Coins },
    { href: "/report",   label: copy.report,   Icon: BarChart3 },
    { href: "/convert",  label: "時間を換算",  Icon: Timer },
    { href: "/cashout",  label: "換金する",    Icon: Coins },
    { href: "/consume",  label: "時間を使う",  Icon: Zap },
  ];

  const PARENT_ITEMS = [
    { href: "/home",          label: copy.home,     Icon: Home },
    { href: "/approvals",     label: "承認待ち",    Icon: Bell },
    { href: "/penalties/new", label: "ペナルティ",  Icon: AlertTriangle },
    { href: "/items",         label: copy.items,    Icon: Database },
    { href: "/expenses",      label: copy.expenses, Icon: Receipt },
    { href: "/history",       label: copy.history,  Icon: BookOpen },
    { href: "/report",        label: copy.report,   Icon: BarChart3 },
    { href: "/audit",         label: copy.audit,    Icon: Settings },
  ];

  const ADMIN_ONLY_ITEMS = [
    { href: "/admin/users",         label: copy.admin,        Icon: Users },
    { href: "/admin/chore-items",   label: "おてつだい項目",  Icon: ListChecks },
    { href: "/admin/penalty-items", label: "ペナルティ項目",  Icon: AlertTriangle },
  ];

  const items = isAdmin
    ? [...PARENT_ITEMS, ...ADMIN_ONLY_ITEMS]
    : isParent
      ? PARENT_ITEMS
      : NAV_ITEMS;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <>
      {/* PC: サイドバー */}
      <aside
        className="hidden lg:flex flex-col w-64 min-h-screen fixed left-0 top-0 border-r"
        style={{
          background: "var(--c-bg-elev, white)",
          borderColor: "var(--c-border, #e5e7eb)",
        }}
      >
        <div className="p-6 border-b" style={{ borderColor: "var(--c-border, #e5e7eb)" }}>
          <div className="flex items-center gap-3">
            <ConceptEmblem concept={concept} />
            <div>
              <h1
                className="font-display text-base leading-tight tracking-wider"
                style={{ color: "var(--c-accent, var(--expo-blue))" }}
              >
                {copy.appName}
              </h1>
              <p className="text-[10px] font-bold mt-0.5 tracking-widest" style={{ color: "var(--c-fg-dim, var(--expo-red))" }}>
                {displayName}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {items.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm"
                style={
                  active
                    ? {
                        background: "var(--c-accent, var(--expo-light-blue))",
                        color: "var(--c-bg, white)",
                        opacity: 1,
                      }
                    : { color: "var(--c-fg-mute, #64748b)" }
                }
              >
                <Icon size={20} style={{ opacity: active ? 1 : 0.7 }} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-1" style={{ borderColor: "var(--c-border, #e5e7eb)" }}>
          <Link
            href="/settings"
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm"
            style={{ color: "var(--c-fg-mute, #64748b)" }}
          >
            <Settings size={20} style={{ opacity: 0.7 }} />
            <span>{copy.settings}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm"
            style={{ color: "var(--c-fg-mute, #64748b)" }}
          >
            <LogOut size={20} style={{ opacity: 0.7 }} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* モバイル: ボトムナビ */}
      <nav className="concept-tabbar lg:hidden fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex px-1">
          {items.slice(0, 5).map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center py-2.5 min-h-[64px] transition-colors relative"
                style={
                  active
                    ? { color: "var(--c-accent, var(--expo-blue))" }
                    : { color: "var(--c-fg-dim, #94a3b8)" }
                }
              >
                {active && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full"
                    style={{ background: "var(--c-accent, var(--expo-red))" }}
                  />
                )}
                <Icon size={22} className="mb-1" style={{ opacity: active ? 1 : 0.7 }} />
                <span className="text-[9px] font-black tracking-wider leading-tight text-center">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
