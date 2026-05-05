"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { BalanceSummary } from "@/components/BalanceSummary";
import { RequestModal } from "@/components/RequestModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { LabelWithGloss } from "@/components/LabelWithGloss";
import { ProgressHeatmap } from "@/components/ProgressHeatmap";
import { ChevronDown, Star, Flame, Trophy, Award, Crown, Coins, Banknote, Target, PlusCircle, ShoppingBag } from "lucide-react";
import { useConcept } from "@/components/ConceptThemeProvider";
import { COPY } from "@/lib/copy";

const BADGE_ICONS: Record<string, React.ElementType> = {
  Flame, Trophy, Star, Award, Crown, Coins, Banknote, Target,
};

const SPENDING_CATS = {
  food:   { label: "食べもの", color: "#f97316" },
  toy:    { label: "おもちゃ",  color: "#8b5cf6" },
  game:   { label: "ゲーム",   color: "#3b82f6" },
  book:   { label: "ほん",     color: "#10b981" },
  outing: { label: "おでかけ", color: "#f59e0b" },
  other:  { label: "その他",   color: "#6b7280" },
} as const;
type SpendingCat = keyof typeof SPENDING_CATS;

type BadgeData = { id: string; label: string; icon: string; earnedAt: string };

type User = {
  id: string;
  displayName: string;
  role: string;
  mustChangePassword: boolean;
  grade?: { gradeLabel: string } | null;
};

type BalanceData = {
  accumulatedMin: number;
  carryoverMin: number;
  virtualAmount: number;
  totalCashed: number;
  totalDeducted: number;
};

type Item = {
  id: string;
  name: string;
  category: string;
  effectiveMin: number;
  isActive: boolean;
};

type Request = {
  id: string;
  status: string;
  minutes: number;
  count: number;
  note: string | null;
  rejectReason: string | null;
  requestedAt: string;
  item: { name: string; category: string };
  user: { id: string; displayName: string };
};

type SavingsGoal = {
  id: string;
  title: string;
  targetAmount: number;
  memo: string | null;
  isAchieved: boolean;
  createdAt: string;
};

type UserWithBalance = {
  id: string;
  displayName: string;
  role: string;
  grade: { gradeLabel: string } | null;
  balance: BalanceData | null;
};

/* ────────────────────────────────── helpers ── */
function formatMin(min: number) {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? "-" : "+";
  if (h === 0) return `${sign}${m}分`;
  return `${sign}${h}時間${m > 0 ? m + "分" : ""}`;
}

function formatAmount(n: number) {
  return n.toLocaleString("ja-JP") + "円";
}

/* 今週月曜0時 */
function weekStart() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ──────────── コンパクト行アイテム ── */
function ItemRow({
  item,
  onRequest,
  readOnly = false,
  hideMin = false,
}: {
  item: Item;
  onRequest?: (i: Item) => void;
  readOnly?: boolean;
  hideMin?: boolean;
}) {
  const isPenalty = item.category === "penalty";
  const isStudy = item.category === "study";
  const minColor = isPenalty ? "var(--c-danger, var(--expo-red))" : "var(--c-accent, var(--expo-blue))";
  const btnBg = isPenalty ? "var(--c-danger, var(--expo-red))" : isStudy ? "var(--c-positive, var(--expo-green))" : "var(--c-accent, var(--expo-blue))";

  return (
    <div
      className="mission-row"
    >
      <div className="flex-1 min-w-0">
        <p className="mission-title leading-snug line-clamp-2" title={item.name}>{item.name}</p>
        {!hideMin && (
          <p className="text-xs font-black mt-0.5" style={{ color: minColor }}>
            {formatMin(item.effectiveMin)}
          </p>
        )}
      </div>
      {!readOnly && onRequest && (
        <button
          onClick={() => onRequest(item)}
          className="btn primary shrink-0 text-xs min-w-[52px] min-h-[36px]"
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          申請
        </button>
      )}
    </div>
  );
}

/* ──────────── カテゴリセクション ── */
const CATEGORY_CONF = {
  chore:   { labelMain: "おてつだい", labelGloss: "おてつだい",   bg: "#eff6ff", border: "var(--expo-blue)", color: "#1e3a8a", headerBg: "var(--expo-blue)" },
  study:   { labelMain: "べんきょう", labelGloss: "べんきょう", bg: "#ecfdf5", border: "var(--expo-green)", color: "#065f46", headerBg: "var(--expo-green)" },
  penalty: { labelMain: "マイナス",   labelGloss: "マイナス",       bg: "#fff8f8", border: "var(--expo-red)",  color: "#991b1b", headerBg: "var(--expo-red)" },
};

function CategorySection({
  category,
  items,
  onRequest,
  defaultOpen = true,
  readOnly = false,
}: {
  category: "chore" | "study" | "penalty";
  items: Item[];
  onRequest?: (i: Item) => void;
  defaultOpen?: boolean;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = CATEGORY_CONF[category];
  if (items.length === 0) return null;

  // Group items by effectiveMin
  const groupedItems = items.reduce((acc, item) => {
    const key = String(item.effectiveMin);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  // Sort groups by absolute value descending (e.g. 60, 50, -60, -30)
  const sortedKeys = Object.keys(groupedItems).sort((a, b) => Math.abs(Number(b)) - Math.abs(Number(a)));

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: `2px solid ${cfg.border}` }}>
      {/* セクションヘッダー */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: cfg.headerBg }}
      >
        <div className="flex items-center gap-2">
          <span className="font-display text-white text-base">
            <LabelWithGloss main={cfg.labelMain} gloss={cfg.labelGloss} />
          </span>
          <span
            className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.3)", color: "white" }}
          >
            {items.length}件
          </span>
        </div>
        <ChevronDown size={20} className={`text-white transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-3 space-y-4" style={{ background: cfg.bg }}>
          {sortedKeys.map((key) => {
            const minItems = groupedItems[key];
            const minVal = Number(key);
            const headerColor = minVal < 0 ? "var(--expo-red)" : "var(--expo-blue)";
            
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm font-black" style={{ color: headerColor }}>
                    {formatMin(minVal)}
                  </span>
                  <div className="h-px flex-1" style={{ background: headerColor, opacity: 0.2 }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {minItems.map((item) => (
                    <ItemRow key={item.id} item={item} onRequest={onRequest} readOnly={readOnly} hideMin={true} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────── 目標貯金カード ── */
function GoalCard({
  goal,
  currentAmount,
  onDelete,
  onAchieve,
  averageYenPerWeek,
}: {
  goal: SavingsGoal;
  currentAmount: number;
  onDelete: (id: string) => void;
  onAchieve: (id: string) => void;
  averageYenPerWeek?: number;
}) {
  const pct = goal.targetAmount <= 0 ? 0 : Math.min(100, Math.round((currentAmount / goal.targetAmount) * 100));
  const reached = currentAmount >= goal.targetAmount;
  
  const remaining = Math.max(0, goal.targetAmount - currentAmount);
  let estimateText = "";
  if (!reached && averageYenPerWeek && averageYenPerWeek > 0) {
    const weeks = Math.ceil(remaining / averageYenPerWeek);
    estimateText = `いまのペースなら あと${weeks}週間！`;
  }

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ border: `2px solid ${reached ? "#4DAD5B" : "#3B4CCA"}` }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: reached ? "linear-gradient(135deg,#4DAD5B,#166534)" : "linear-gradient(135deg,#3B4CCA,#1a1e4e)" }}
      >
        <div>
          <p className="font-black text-white text-sm">{goal.title}</p>
          {goal.memo && <p className="text-xs text-white/70 mt-0.5">{goal.memo}</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-white text-lg">{formatAmount(goal.targetAmount)}</p>
          {reached && !goal.isAchieved && (
            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "#FFDE00", color: "#1a1e4e" }}>
              目標たっせい！
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-300 mb-1.5">
          <span>いまの残高: {formatAmount(currentAmount)}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "#e5e7eb" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: reached ? "#4DAD5B" : "#3B4CCA", minWidth: pct > 0 ? "6px" : "0" }}
          />
        </div>

        {!reached && estimateText && (
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-300 mt-2 text-right">
            {estimateText}
          </p>
        )}

        <div className="flex gap-2 mt-3">
          {reached && !goal.isAchieved && (
            <button
              onClick={() => onAchieve(goal.id)}
              className="flex-1 py-2 rounded-lg font-black text-white text-xs min-h-[36px] transition-all active:scale-95"
              style={{ background: "#4DAD5B", border: "2px solid #166534" }}
            >
              たっせいにする
            </button>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="px-3 py-2 rounded-lg font-bold text-xs min-h-[36px] transition-all active:scale-95"
            style={{ color: "#CC0000", border: "2px solid #fca5a5" }}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [streak, setStreak] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithBalance[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [modal, setModal] = useState<Item | null>(null);
  const [toast, setToast] = useState("");
  const [averageYenPerWeek, setAverageYenPerWeek] = useState(500);
  const [badges, setBadges] = useState<BadgeData[]>([]);

  // 臨時収入モーダル（親用）
  const [windfallTarget, setWindfallTarget] = useState<{ id: string; name: string } | null>(null);
  const [windfallLabel, setWindfallLabel] = useState("");
  const [windfallAmount, setWindfallAmount] = useState("");
  const [windfallNote, setWindfallNote] = useState("");
  const [windfallLoading, setWindfallLoading] = useState(false);

  // 支出モーダル（子供用）
  const [showSpendingForm, setShowSpendingForm] = useState(false);
  const [spendingCategory, setSpendingCategory] = useState<SpendingCat>("food");
  const [spendingAmount, setSpendingAmount] = useState("");
  const [spendingMemo, setSpendingMemo] = useState("");
  const [spendingLoading, setSpendingLoading] = useState(false);

  // 今月の支出データ
  const [monthlySpending, setMonthlySpending] = useState<{ category: string; amount: number }[]>([]);

  // 否決モーダル
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // 集計確認
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [settlementMsg, setSettlementMsg] = useState("");

  // 目標追加フォーム
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalMemo, setGoalMemo] = useState("");
  const [goalLoading, setGoalLoading] = useState(false);

  const { concept } = useConcept();
  const copy = COPY[concept];

  const isParent = me?.role === "approver" || me?.role === "admin";
  const canApprove = me?.role === "approver" || me?.role === "admin";

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/"); return; }
      const meData = await meRes.json();
      setMe(meData);

      if (meData.mustChangePassword) { router.push("/change-password"); return; }

      if (meData.role === "child") {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const [balRes, itemsRes, reqRes, goalsRes, statsRes, badgesRes, spendingRes] = await Promise.all([
          fetch(`/api/balance/${meData.id}`),
          fetch("/api/items"),
          fetch("/api/requests?userId=" + meData.id),
          fetch("/api/goals"),
          fetch("/api/stats/personal-best"),
          fetch("/api/badges"),
          fetch(`/api/spending?from=${monthStart}`),
        ]);
        if (balRes.ok) {
          const balData = await balRes.json();
          setBalance(balData.balance);
          setStreak(balData.streak ?? 0);
        }
        if (itemsRes.ok) setItems(await itemsRes.json());
        if (reqRes.ok) setRequests(await reqRes.json());
        if (goalsRes.ok) setGoals(await goalsRes.json());
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setAverageYenPerWeek(stats.averageYenPerWeek);
        }
        if (badgesRes.ok) setBadges(await badgesRes.json());
        if (spendingRes.ok) {
          const spendingData: { category: string; amount: number }[] = await spendingRes.json();
          setMonthlySpending(spendingData);
        }
      } else {
        const [usersRes, pendingRes, itemsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/requests?status=pending"),
          fetch("/api/items"),
        ]);
        if (usersRes.ok) setAllUsers(await usersRes.json());
        if (pendingRes.ok) setPendingRequests(await pendingRes.json());
        if (itemsRes.ok) setItems(await itemsRes.json());
      }
    } catch {
      // ネットワークエラーは無視
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    await fetch(`/api/requests/${id}/approve`, { method: "PUT" });
    setToast("承認しました");
    fetchData();
  };

  const openReject = (id: string) => {
    setRejectTarget(id);
    setRejectReason("");
  };

  const submitReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    await fetch(`/api/requests/${rejectTarget}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectReason: rejectReason.trim() }),
    });
    setRejectTarget(null);
    setToast("否決しました");
    fetchData();
  };

  const handleSettlement = async () => {
    setShowSettleConfirm(false);
    const res = await fetch("/api/settlement/run", { method: "POST" });
    const data = await res.json();
    setSettlementMsg(`集計完了: ${data.processed}人処理しました`);
    fetchData();
    setTimeout(() => setSettlementMsg(""), 4000);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalAmount) return;
    setGoalLoading(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: goalTitle.trim(), targetAmount: Number(goalAmount), memo: goalMemo.trim() || undefined }),
    });
    setGoalLoading(false);
    if (res.ok) {
      setGoalTitle(""); setGoalAmount(""); setGoalMemo("");
      setShowGoalForm(false);
      fetchData();
      setToast("目標を追加しました");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleAchieveGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAchieved: true }),
    });
    setToast("やったー！目標たっせいです！");
    fetchData();
  };

  const handleWindfall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!windfallTarget || !windfallLabel.trim() || !windfallAmount) return;
    setWindfallLoading(true);
    const res = await fetch("/api/windfalls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: windfallTarget.id, label: windfallLabel.trim(), amount: Number(windfallAmount), note: windfallNote.trim() || undefined }),
    });
    setWindfallLoading(false);
    if (res.ok) {
      setWindfallTarget(null);
      setWindfallLabel(""); setWindfallAmount(""); setWindfallNote("");
      setToast(`臨時収入を登録しました`);
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      setToast(data.error ?? "臨時収入: エラーが発生しました");
    }
  };

  const handleSpending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendingAmount) return;
    setSpendingLoading(true);
    const res = await fetch("/api/spending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(spendingAmount), category: spendingCategory, memo: spendingMemo.trim() || undefined }),
    });
    setSpendingLoading(false);
    if (res.ok) {
      setShowSpendingForm(false);
      setSpendingAmount(""); setSpendingMemo(""); setSpendingCategory("food");
      setToast("支出を記録しました");
      fetchData();
    } else {
      const err = await res.json();
      setToast(err.error ?? "支出記録: エラーが発生しました");
    }
  };

  if (!me) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: "#3B4CCA", borderTopColor: "transparent" }}
          />
          <p className="mt-3 font-bold text-gray-500 dark:text-gray-300">よみこみ中...</p>
        </div>
      </div>
    );
  }

  /* ─────── 親ビュー ─────── */
  if (isParent) {
    const children = allUsers.filter((u) => u.role === "child");

    const choreItems  = items.filter((i) => i.category === "chore");
    const studyItems  = items.filter((i) => i.category === "study");
    const penaltyItems = items.filter((i) => i.category === "penalty");

    return (
      <div className="lg:pl-64 min-h-screen">
        <Nav role={me.role} displayName={me.displayName} />
        {toast && <Toast message={toast} onDismiss={() => setToast("")} />}

        <main className="p-4 pb-24 lg:pb-8 space-y-6">
          <h1 className="font-display text-2xl mt-2" style={{ color: "var(--expo-blue)" }}>ホーム</h1>

          {/* 承認待ち */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-black text-gray-700">承認まちの申請</h2>
              {pendingRequests.length > 0 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ background: "#CC0000" }}>
                  {pendingRequests.length}
                </span>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-300 text-sm bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center font-bold">
                承認まちの申請はありません
              </p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm"
                    style={{ borderLeft: "5px solid #f59e0b" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm" style={{ color: "#1a1e4e" }}>
                          {req.user.displayName}
                        </p>
                        <p className="text-sm text-gray-700 mt-0.5 font-bold">{req.item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-sm font-black" style={{ color: req.minutes >= 0 ? "#3B4CCA" : "#CC0000" }}>
                            {req.minutes >= 0 ? "+" : ""}{req.minutes}分
                            {req.count > 1 && (
                              <span className="text-xs font-bold ml-1 text-gray-400 dark:text-gray-300">（{req.count}回）</span>
                            )}
                          </p>
                        </div>
                        {req.note && (
                          <p className="text-xs font-bold mt-1 px-2 py-1 rounded-lg"
                             style={{ background: "#f3f4f6", color: "#374151" }}>
                            {req.note}
                          </p>
                        )}
                      </div>
                      {canApprove && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="px-3 py-2 text-white text-sm rounded-xl font-black min-h-[44px] transition-all active:scale-95"
                            style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b", boxShadow: "0 3px 0 #0d2d6b" }}
                          >
                            OK
                          </button>
                          <button
                            onClick={() => openReject(req.id)}
                            className="px-3 py-2 text-white text-sm rounded-xl font-black min-h-[44px] transition-all active:scale-95"
                            style={{ background: "var(--expo-red)", border: "2px solid #7f1d1d", boxShadow: "0 3px 0 #7f1d1d" }}
                          >
                            <LabelWithGloss main="やりなおし" gloss="差し戻し" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 子供の残高 */}
          <section>
            <h2 className="font-black text-gray-700 mb-3">みんなの残高</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {children.map((u) => (
                <div key={u.id} className="space-y-2">
                  <BalanceSummary
                    displayName={u.displayName}
                    gradeLabel={u.grade?.gradeLabel}
                    balance={u.balance}
                    compact
                  />
                  <button
                    onClick={() => { setWindfallTarget({ id: u.id, name: u.displayName }); setWindfallLabel(""); setWindfallAmount(""); setWindfallNote(""); }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl font-black text-sm text-white transition-all active:scale-95"
                    style={{ background: "#f59e0b", border: "2px solid #b45309", boxShadow: "0 2px 0 #b45309" }}
                  >
                    <PlusCircle size={15} />
                    ＋臨時収入
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 土曜集計 */}
          <section>
            <h2 className="font-black text-gray-700 mb-3">週次集計</h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <button
                onClick={() => setShowSettleConfirm(true)}
                className="w-full py-3 text-white rounded-xl font-black min-h-[44px] transition-all active:scale-95"
                style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b", boxShadow: "0 4px 0 #0d2d6b" }}
              >
                週次集計を実行する
              </button>
              {settlementMsg && (
                <p className="mt-2 text-sm text-center font-black" style={{ color: "#4DAD5B" }}>
                  {settlementMsg}
                </p>
              )}
            </div>
          </section>

          {/* 出展タスク・トラブル項目（参照用） */}
          <section className="space-y-4">
            <h2 className="font-black text-gray-700 mb-3 mt-8 border-t pt-8">おこづかい項目（参照用）</h2>
            <CategorySection category="chore" items={choreItems} readOnly />
            <CategorySection category="study" items={studyItems} readOnly />
            <CategorySection category="penalty" items={penaltyItems} readOnly defaultOpen={false} />
          </section>
        </main>

        {/* 否決モーダル */}
        {rejectTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "3px solid #CC0000" }}>
              <div className="px-5 py-3 font-display text-white" style={{ background: "var(--expo-red)" }}>
                やりなおし理由の入力
              </div>
              <div className="p-5 space-y-4">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl p-3 text-sm font-bold resize-none focus:outline-none"
                  style={{ border: "2px solid #fca5a5", minHeight: "80px" }}
                  placeholder="否決理由を入力してください"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setRejectTarget(null)}
                    className="flex-1 py-3 rounded-xl font-black text-gray-600 transition-all active:scale-95"
                    style={{ border: "2px solid #d1d5db" }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={submitReject}
                    disabled={!rejectReason.trim()}
                    className="flex-1 py-3 rounded-xl font-black text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "var(--expo-red)", border: "2px solid #7f1d1d" }}
                  >
                    やりなおしにする
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 臨時収入モーダル */}
        {windfallTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "3px solid #f59e0b" }}>
              <div className="px-5 py-3 font-display text-white" style={{ background: "#f59e0b" }}>
                {windfallTarget.name} に臨時収入を登録
              </div>
              <form onSubmit={handleWindfall} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-black mb-1.5" style={{ color: "#1a1e4e" }}>種類（お年玉・プレゼント等）</label>
                  <input
                    value={windfallLabel}
                    onChange={(e) => setWindfallLabel(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                    style={{ border: "2px solid #fde68a", background: "#fffbeb" }}
                    placeholder="例: お年玉、誕生日プレゼント"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-black mb-1.5" style={{ color: "#1a1e4e" }}>金額（円）</label>
                  <input
                    type="number" min="1"
                    value={windfallAmount}
                    onChange={(e) => setWindfallAmount(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                    style={{ border: "2px solid #fde68a", background: "#fffbeb" }}
                    placeholder="例: 3000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black mb-1.5 text-gray-500">メモ（任意）</label>
                  <input
                    value={windfallNote}
                    onChange={(e) => setWindfallNote(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                    style={{ border: "2px solid #e5e7eb", background: "#f9fafb" }}
                    placeholder="補足など"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setWindfallTarget(null)}
                    className="flex-1 py-3 rounded-xl font-black text-gray-600 active:scale-95"
                    style={{ border: "2px solid #d1d5db" }}>
                    キャンセル
                  </button>
                  <button type="submit" disabled={windfallLoading}
                    className="flex-1 py-3 rounded-xl font-black text-white active:scale-95 disabled:opacity-50"
                    style={{ background: "#f59e0b", border: "2px solid #b45309", boxShadow: "0 3px 0 #b45309" }}>
                    {windfallLoading ? "登録中..." : "登録する"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 集計確認モーダル */}
        {showSettleConfirm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "3px solid #3B4CCA" }}>
              <div className="px-5 py-3 font-display text-white" style={{ background: "var(--expo-blue)" }}>
                週次集計を実行しますか？
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm font-bold text-gray-600">
                  みんなの今週の申請を集計します。この操作は元に戻せません。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSettleConfirm(false)}
                    className="flex-1 py-3 rounded-xl font-black text-gray-600 transition-all active:scale-95"
                    style={{ border: "2px solid #d1d5db" }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSettlement}
                    className="flex-1 py-3 rounded-xl font-black text-white transition-all active:scale-95"
                    style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b" }}
                  >
                    実行する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─────── 子供ビュー ─────── */
  const choreItems  = items.filter((i) => i.category === "chore");
  const studyItems  = items.filter((i) => i.category === "study");
  const penaltyItems = items.filter((i) => i.category === "penalty");
  const recentRequests = requests.slice(0, 10);

  // 今週の集計
  const ws = weekStart();
  const weekRequests = requests.filter(
    (r) => r.status === "approved" && new Date(r.requestedAt) >= ws
  );
  const weekMin = weekRequests.reduce((s, r) => s + r.minutes, 0);
  const weekCount = weekRequests.length;

  // 非達成ゴール
  const activeGoals = goals.filter((g) => !g.isAchieved);

  return (
    <div className="lg:pl-64 min-h-screen">
      <Nav role={me.role} displayName={me.displayName} />
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}

      <main className="p-4 pb-24 lg:pb-8 md:max-w-5xl lg:max-w-6xl mx-auto space-y-6">
        <div className="page-header">
          <p className="page-eyebrow">{copy.welcome}</p>
          <h1 className="page-title">{copy.moonRoom}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左カラム：ダッシュボード系 */}
          <div className="space-y-6">
        {/* 残高サマリー */}
        <div className="space-y-2">
          <BalanceSummary
            displayName={me.displayName}
            gradeLabel={me.grade?.gradeLabel}
            balance={balance}
            streak={streak}
          />
          <button
            onClick={() => { setShowSpendingForm(true); setSpendingAmount(""); setSpendingMemo(""); setSpendingCategory("food"); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95"
            style={{ background: "#f97316", border: "2px solid #c2410c", boxShadow: "0 2px 0 #c2410c" }}
          >
            <ShoppingBag size={15} />
            ＋使ったお金を記録する
          </button>
          <ProgressHeatmap requests={requests} />
        </div>

        {/* バッジ */}
        {badges.length > 0 && (
          <section>
            <h2 className="font-black text-gray-700 text-sm mb-2">げっとしたバッジ</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => {
                const Icon = BADGE_ICONS[b.icon] ?? Star;
                return (
                  <div
                    key={b.id}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm"
                    style={{ border: "2px solid #fbbf24" }}
                    title={new Date(b.earnedAt).toLocaleDateString("ja-JP")}
                  >
                    <Icon size={20} style={{ color: "#f59e0b" }} />
                    <span className="text-[10px] font-black text-gray-600 dark:text-gray-300">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 今週サマリー */}
        {weekCount > 0 && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{ background: "white", border: "2px solid var(--expo-blue)" }}
          >
            <div>
              <p className="text-xs font-black" style={{ color: "var(--expo-blue)" }}>今週の実績</p>
              <p className="font-display text-xl mt-0.5" style={{ color: "#1a1e4e" }}>
                {weekMin >= 0 ? "+" : ""}{weekMin}分
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-300">承認済み</p>
              <p className="font-black text-lg" style={{ color: "#1a1e4e" }}>{weekCount}件</p>
            </div>
          </div>
        )}

        {/* 今月の支出グラフ */}
        {monthlySpending.length > 0 && (() => {
          const totalSpent = monthlySpending.reduce((s, r) => s + r.amount, 0);
          const catMap: Record<string, number> = {};
          for (const r of monthlySpending) catMap[r.category] = (catMap[r.category] ?? 0) + r.amount;
          const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
          const top3 = sorted.slice(0, 3);
          const otherAmt = sorted.slice(3).reduce((s, [, v]) => s + v, 0);
          const segments = otherAmt > 0 ? [...top3, ["other", otherAmt] as [string, number]] : top3;
          return (
            <div className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm" style={{ border: "2px solid #fed7aa" }}>
              <h2 className="font-black text-sm text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                <ShoppingBag size={14} style={{ color: "#f97316" }} />
                今月の支出 <span className="font-black text-orange-600">{totalSpent.toLocaleString()}円</span>
              </h2>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                {segments.map(([cat, amt]) => {
                  const color = SPENDING_CATS[cat as SpendingCat]?.color ?? "#6b7280";
                  return <div key={cat} style={{ width: `${(amt / totalSpent) * 100}%`, background: color }} />;
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {segments.map(([cat, amt]) => {
                  const cfg = SPENDING_CATS[cat as SpendingCat];
                  return (
                    <div key={cat} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: cfg?.color ?? "#6b7280" }} />
                      {cfg?.label ?? cat}: {amt.toLocaleString()}円
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 目標貯金 */}
        {activeGoals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-black text-gray-700 text-sm">ほしいものリスト</h2>
              <button
                onClick={() => setShowGoalForm(true)}
                className="text-xs font-black px-3 py-1.5 rounded-lg text-white"
                style={{ background: "var(--expo-blue)" }}
              >
                + 追加
              </button>
            </div>
            <div className="space-y-3">
              {activeGoals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  currentAmount={balance?.virtualAmount ?? 0}
                  onDelete={handleDeleteGoal}
                  onAchieve={handleAchieveGoal}
                  averageYenPerWeek={averageYenPerWeek}
                />
              ))}
            </div>
          </section>
        )}

          {/* 目標追加ボタン（ゴールなしの時） */}
          {activeGoals.length === 0 && (
            <button
              onClick={() => setShowGoalForm(true)}
              className="w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
              style={{ border: "2px dashed #93c5fd", color: "var(--expo-blue)", background: "white" }}
            >
              + ほしいものを追加する
            </button>
          )}
          </div>

          {/* 右カラム：申請・履歴系 */}
          <div className="space-y-6">

        {/* おてつだい */}
        <CategorySection
          category="chore"
          items={choreItems}
          onRequest={(item) => setModal(item)}
        />

        {/* べんきょう */}
        <CategorySection
          category="study"
          items={studyItems}
          onRequest={(item) => setModal(item)}
        />

        {/* マイナス */}
        <CategorySection
          category="penalty"
          items={penaltyItems}
          onRequest={(item) => setModal(item)}
          defaultOpen={false}
        />

        {/* 申請履歴 */}
        <section>
          <h2 className="font-black text-gray-700 mb-2 text-sm">申請のきろく（直近10件）</h2>
          {recentRequests.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-300 text-sm text-center py-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm font-bold">
              申請のきろくがありません
            </p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((req) => (
                <div key={req.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-800 dark:text-gray-100 text-sm leading-snug">{req.item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-black" style={{ color: req.minutes >= 0 ? "var(--expo-blue)" : "var(--expo-red)" }}>
                          {req.minutes >= 0 ? "+" : ""}{req.minutes}分
                          {req.count > 1 && <span className="font-bold ml-1 text-gray-400 dark:text-gray-300">（{req.count}回）</span>}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-300 font-bold">
                          {new Date(req.requestedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {req.note && (
                        <p className="text-xs font-bold mt-1" style={{ color: "#6b7280" }}>{req.note}</p>
                      )}
                      {req.rejectReason && (
                        <p className="text-xs font-bold mt-1" style={{ color: "var(--expo-red)" }}>
                          やりなおし: {req.rejectReason}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
          </section>
          </div>
        </div>
      </main>

      {/* 申請モーダル */}
      {modal && (
        <RequestModal
          itemId={modal.id}
          itemName={modal.name}
          effectiveMin={modal.effectiveMin}
          category={modal.category}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setToast("申請しました");
            fetchData();
          }}
        />
      )}

      {/* 支出記録モーダル */}
      {showSpendingForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "3px solid #f97316" }}>
            <div className="px-5 py-3 font-display text-white" style={{ background: "#f97316" }}>
              使ったお金を記録する
            </div>
            <form onSubmit={handleSpending} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-black mb-1.5" style={{ color: "#1a1e4e" }}>カテゴリ</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(SPENDING_CATS) as [SpendingCat, typeof SPENDING_CATS[SpendingCat]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSpendingCategory(key)}
                      className="py-2 rounded-xl text-xs font-black transition-all"
                      style={{
                        background: spendingCategory === key ? cfg.color : "#f9fafb",
                        color: spendingCategory === key ? "white" : "#374151",
                        border: `2px solid ${spendingCategory === key ? cfg.color : "#e5e7eb"}`,
                      }}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-black mb-1.5" style={{ color: "#1a1e4e" }}>金額（円）</label>
                <input
                  type="number" min="1"
                  value={spendingAmount}
                  onChange={(e) => setSpendingAmount(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                  style={{ border: "2px solid #fed7aa", background: "#fff7ed" }}
                  placeholder="例: 200"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-1.5 text-gray-500">メモ（任意）</label>
                <input
                  value={spendingMemo}
                  onChange={(e) => setSpendingMemo(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                  style={{ border: "2px solid #e5e7eb", background: "#f9fafb" }}
                  placeholder="例: アイスクリーム"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowSpendingForm(false)}
                  className="flex-1 py-3 rounded-xl font-black text-gray-600 active:scale-95"
                  style={{ border: "2px solid #d1d5db" }}>
                  キャンセル
                </button>
                <button type="submit" disabled={spendingLoading}
                  className="flex-1 py-3 rounded-xl font-black text-white active:scale-95 disabled:opacity-50"
                  style={{ background: "#f97316", border: "2px solid #c2410c", boxShadow: "0 3px 0 #c2410c" }}>
                  {spendingLoading ? "記録中..." : "記録する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 目標追加モーダル */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            style={{ border: "3px solid var(--expo-blue)" }}
          >
            <div className="px-5 py-3 font-display text-white" style={{ background: "var(--expo-blue)" }}>
              ほしいものを追加する
            </div>
            <form onSubmit={handleAddGoal} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-black mb-1.5" style={{ color: "#1a1e4e" }}>
                  何を買いたい？
                </label>
                <input
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                  style={{ border: "2px solid #93c5fd", background: "#eff6ff" }}
                  placeholder="例: レゴ、ゲームソフト…"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-1.5" style={{ color: "#1a1e4e" }}>
                  目標金額（円）
                </label>
                <input
                  type="number"
                  min="1"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                  style={{ border: "2px solid #93c5fd", background: "#eff6ff" }}
                  placeholder="例: 3000"
                />
              </div>
              <div>
                <label className="block text-sm font-black mb-1.5 text-gray-500 dark:text-gray-300">メモ（任意）</label>
                <input
                  value={goalMemo}
                  onChange={(e) => setGoalMemo(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                  style={{ border: "2px solid #e5e7eb", background: "#f9fafb" }}
                  placeholder="補足など"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="flex-1 py-3 rounded-xl font-black text-gray-600 transition-all active:scale-95"
                  style={{ border: "2px solid #d1d5db" }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={goalLoading}
                  className="flex-1 py-3 rounded-xl font-black text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b", boxShadow: "0 3px 0 #0d2d6b" }}
                >
                  {goalLoading ? "追加中..." : "追加する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
