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
import { ChevronDown, Star, Flame, Trophy, Award, Crown, Coins, Banknote, Target, PlusCircle, ShoppingBag, Timer, Zap, AlertTriangle } from "lucide-react";

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
  yenBalance: number;
};

type PenaltyItemWithMeta = {
  id: string;
  name: string;
  effectiveMin: number;
  category: string;
  isActive: boolean;
  mode?: string;
  unitLabel?: string | null;
};

import { formatMin, formatYen, formatSignedMin } from "@/lib/format";
import { MINUTES_PER_UNIT, YEN_PER_UNIT, CASHOUT_FEE } from "@/lib/constants";
import { Minus, Plus } from "lucide-react";

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
  const minColor = isPenalty ? "var(--expo-red)" : "var(--expo-blue)";
  const btnBg = isPenalty ? "var(--expo-red)" : isStudy ? "var(--expo-green)" : "var(--expo-blue)";
  const btnBorder = isPenalty ? "#7f1d1d" : isStudy ? "#006633" : "#0d2d6b";

  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800"
      style={{ border: "1px solid #e5e7eb" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2" title={item.name}>{item.name}</p>
        {!hideMin && (
          <p className="text-xs font-black mt-0.5" style={{ color: minColor }}>
            {formatMin(item.effectiveMin)}
          </p>
        )}
      </div>
      {!readOnly && onRequest && (
        <button
          onClick={() => onRequest(item)}
          className="shrink-0 px-3 py-1.5 rounded-lg font-black text-xs text-white min-w-[52px] min-h-[36px] transition-all active:scale-95"
          style={{ background: btnBg, border: `1.5px solid ${btnBorder}`, boxShadow: `0 2px 0 ${btnBorder}` }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
        >
          申請する
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
          <p className="font-display text-white text-lg">{formatYen(goal.targetAmount)}</p>
          {reached && !goal.isAchieved && (
            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "#FFDE00", color: "#1a1e4e" }}>
              目標たっせい！
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-300 mb-1.5">
          <span>いまの残高: {formatYen(currentAmount)}</span>
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
  const [yenBalance, setYenBalance] = useState(0);
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

  // ペナルティ登録モーダル（親用）
  const [penaltyTarget, setPenaltyTarget] = useState<{ id: string; name: string } | null>(null);
  const [penaltyItemId, setPenaltyItemId] = useState("");
  const [penaltyCount, setPenaltyCount] = useState("1");
  const [penaltyActualValue, setPenaltyActualValue] = useState("1");
  const [penaltyOccurredAt, setPenaltyOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyLoading, setPenaltyLoading] = useState(false);

  // 換金モーダル（親が子の代わりに換金）
  const [cashoutTarget, setCashoutTarget] = useState<{ id: string; name: string; yenBalance: number } | null>(null);
  const [cashoutLoading, setCashoutLoading] = useState(false);

  // 時間→円換算モーダル（親が子の時間を換算）
  const [timeConvertTarget, setTimeConvertTarget] = useState<{ id: string; name: string; accMin: number } | null>(null);
  const [timeConvertLoading, setTimeConvertLoading] = useState(false);

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

  // ChoreItem/PenaltyItem マスタ（親ビュー参照用）
  const [masterChoreItems, setMasterChoreItems] = useState<Item[]>([]);
  const [masterPenaltyItems, setMasterPenaltyItems] = useState<PenaltyItemWithMeta[]>([]);
  const [todayConsumeMin, setTodayConsumeMin] = useState(0);

  // 今日の残高詳細（改善1）
  const [todayTimePlus, setTodayTimePlus] = useState(0);
  const [todayTimeMinus, setTodayTimeMinus] = useState(0);

  // ホーム換算フォーム（改善2）
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertUnits, setConvertUnits] = useState(1);
  const [convertSaving, setConvertSaving] = useState(false);

  // クイック登録（改善7）: localStorage から最近使った itemId を管理
  const [recentItemIds, setRecentItemIds] = useState<string[]>([]);

  // 週次集計後の換金モーダル（改善3）
  const [postSettleChildren, setPostSettleChildren] = useState<{ id: string; name: string; yenBalance: number }[]>([]);
  const [postSettleSelected, setPostSettleSelected] = useState<Set<string>>(new Set());
  const [postSettleSaving, setPostSettleSaving] = useState(false);

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
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const [balRes, itemsRes, reqRes, goalsRes, statsRes, badgesRes, spendingRes, consumeRes, todayRes] = await Promise.all([
          fetch(`/api/balance/${meData.id}`),
          fetch("/api/items"),
          fetch("/api/requests?userId=" + meData.id),
          fetch("/api/goals"),
          fetch("/api/stats/personal-best"),
          fetch("/api/badges"),
          fetch(`/api/spending?from=${monthStart}`),
          fetch(`/api/time-consumes?from=${todayStart.toISOString()}`),
          fetch(`/api/balance/${meData.id}/today`),
        ]);
        if (balRes.ok) {
          const balData = await balRes.json();
          setBalance(balData.balance);
          setYenBalance(balData.yenBalance ?? balData.balance?.virtualAmount ?? 0);
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
        if (consumeRes.ok) {
          const consumeData: { minutesUsed: number }[] = await consumeRes.json();
          setTodayConsumeMin(consumeData.reduce((sum, c) => sum + c.minutesUsed, 0));
        }
        if (todayRes.ok) {
          const td = await todayRes.json();
          setTodayTimePlus(td.todayTimePlus ?? 0);
          setTodayTimeMinus(td.todayTimeMinus ?? 0);
        }
        // localStorageから最近使った項目IDを読み込む
        try {
          const stored = localStorage.getItem(`recentItems_${meData.id}`);
          if (stored) setRecentItemIds(JSON.parse(stored));
        } catch { /* ignore */ }
      } else {
        const [usersRes, pendingRes, itemsRes, choreRes, penaltyRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/requests?status=pending"),
          fetch("/api/items"),
          fetch("/api/chore-items"),
          fetch("/api/penalty-items"),
        ]);
        if (usersRes.ok) setAllUsers(await usersRes.json());
        if (pendingRes.ok) setPendingRequests(await pendingRes.json());
        if (itemsRes.ok) setItems(await itemsRes.json());
        if (choreRes.ok) {
          const choreData: (Item & { category: string })[] = await choreRes.json();
          setMasterChoreItems(choreData.map((i) => ({
            ...i,
            category: i.category === "べんきょう" ? "study" : "chore",
            isActive: true,
          })));
        }
        if (penaltyRes.ok) {
          const penaltyData: Item[] = await penaltyRes.json();
          setMasterPenaltyItems(penaltyData.map((i) => ({ ...i, category: "penalty", isActive: true })));
        }
      }
    } catch {
      // ネットワークエラーは無視
    }
  }, [router]);

  useEffect(() => { (async () => { await fetchData(); })(); }, [fetchData]);

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
    await fetchData();
    // 換金候補を表示（改善3）
    const usersRes = await fetch("/api/users");
    if (usersRes.ok) {
      const users: UserWithBalance[] = await usersRes.json();
      const candidates = users
        .filter((u) => u.role === "child" && (u.yenBalance ?? 0) >= 1000)
        .map((u) => ({ id: u.id, name: u.displayName, yenBalance: u.yenBalance ?? 0 }));
      if (candidates.length > 0) {
        setPostSettleChildren(candidates);
        setPostSettleSelected(new Set(candidates.map((c) => c.id)));
      }
    }
    setTimeout(() => setSettlementMsg(""), 4000);
  };

  const handlePostSettle = async () => {
    if (postSettleSelected.size === 0) { setPostSettleChildren([]); return; }
    setPostSettleSaving(true);
    for (const childId of postSettleSelected) {
      await fetch("/api/cashouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: childId }),
      });
    }
    setPostSettleSaving(false);
    setPostSettleChildren([]);
    setToast(`${postSettleSelected.size}人分の換金申請を登録しました`);
    fetchData();
  };

  const handleConvert = async () => {
    if (convertUnits < 1) return;
    setConvertSaving(true);
    const minutesUsed = convertUnits * MINUTES_PER_UNIT;
    const res = await fetch("/api/time-converts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutesUsed }),
    });
    setConvertSaving(false);
    if (res.ok) {
      setConvertOpen(false);
      setConvertUnits(1);
      setToast(`${formatMin(minutesUsed)} → ${formatYen(convertUnits * YEN_PER_UNIT)} に換算しました`);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      setToast(err.error ?? "換算に失敗しました");
    }
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
    }
  };

  const handlePenaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penaltyTarget || !penaltyItemId || !penaltyReason.trim()) return;
    const selectedItem = masterPenaltyItems.find((i) => i.id === penaltyItemId);
    const isProportional = selectedItem?.mode === "PROPORTIONAL";
    setPenaltyLoading(true);
    const res = await fetch("/api/penalty-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: penaltyTarget.id,
        penaltyItemId,
        count: isProportional ? 1 : Number(penaltyCount),
        actualValue: isProportional ? Number(penaltyActualValue) : undefined,
        occurredAt: penaltyOccurredAt,
        reason: penaltyReason.trim(),
      }),
    });
    setPenaltyLoading(false);
    if (res.ok) {
      setPenaltyTarget(null);
      setPenaltyItemId("");
      setPenaltyReason("");
      setToast(`${penaltyTarget.name} にペナルティを記録しました`);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      setToast(err.error ?? "エラーが発生しました");
    }
  };

  const handleCashout = async () => {
    if (!cashoutTarget) return;
    setCashoutLoading(true);
    const res = await fetch("/api/cashouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: cashoutTarget.id }),
    });
    setCashoutLoading(false);
    if (res.ok) {
      const data = await res.json();
      setCashoutTarget(null);
      const sign = data.netYen >= 0 ? "+" : "";
      setToast(`換金しました（${sign}${data.netYen.toLocaleString()}円）`);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      setToast(err.error ?? "換金に失敗しました");
    }
  };

  const handleTimeConvertForChild = async () => {
    if (!timeConvertTarget) return;
    const { accMin } = timeConvertTarget;
    const isNegative = accMin < 0;
    const absMin = Math.abs(accMin);
    const convertibleMin = Math.floor(absMin / MINUTES_PER_UNIT) * MINUTES_PER_UNIT;
    if (convertibleMin < MINUTES_PER_UNIT) {
      setToast(`換算できる時間がありません（${MINUTES_PER_UNIT}分単位）`);
      setTimeConvertTarget(null);
      return;
    }
    const minutesUsed = isNegative ? -convertibleMin : convertibleMin;
    setTimeConvertLoading(true);
    const res = await fetch("/api/time-converts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: timeConvertTarget.id, minutesUsed }),
    });
    setTimeConvertLoading(false);
    if (res.ok) {
      const data = await res.json();
      setTimeConvertTarget(null);
      const yenStr = data.yenGained >= 0 ? `+${data.yenGained.toLocaleString()}円` : `${data.yenGained.toLocaleString()}円`;
      setToast(`${formatMin(Math.abs(minutesUsed))} → ${yenStr} に換算しました`);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      setToast(err.error ?? "換算に失敗しました");
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
      setToast(err.error ?? "エラーが発生しました");
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

    // 参照用マスタ（ChoreItem/PenaltyItem、category は正規化済み）
    const refChoreItems   = masterChoreItems.filter((i) => i.category === "chore");
    const refStudyItems   = masterChoreItems.filter((i) => i.category === "study");
    const refPenaltyItems = masterPenaltyItems;

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
                            {formatSignedMin(req.minutes)}
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
              {children.map((u) => {
                const accMin = u.balance?.accumulatedMin ?? 0;
                const yenBal = u.yenBalance ?? 0;
                const canCashout = yenBal !== 0 && !(yenBal > 0 && yenBal < CASHOUT_FEE);
                const canConvert = Math.abs(accMin) >= MINUTES_PER_UNIT;
                return (
                  <div key={u.id} className="space-y-2">
                    <BalanceSummary
                      displayName={u.displayName}
                      gradeLabel={u.grade?.gradeLabel}
                      balance={u.balance}
                      compact
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { setWindfallTarget({ id: u.id, name: u.displayName }); setWindfallLabel(""); setWindfallAmount(""); setWindfallNote(""); }}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs text-white transition-all active:scale-95"
                        style={{ background: "#f59e0b", border: "2px solid #b45309", boxShadow: "0 2px 0 #b45309" }}
                      >
                        <PlusCircle size={13} />
                        臨時収入
                      </button>
                      <button
                        onClick={() => {
                          setPenaltyTarget({ id: u.id, name: u.displayName });
                          setPenaltyItemId(""); setPenaltyCount("1"); setPenaltyActualValue("1");
                          setPenaltyReason(""); setPenaltyOccurredAt(new Date().toISOString().slice(0, 10));
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs text-white transition-all active:scale-95"
                        style={{ background: "var(--expo-red)", border: "2px solid #7f1d1d", boxShadow: "0 2px 0 #7f1d1d" }}
                      >
                        <AlertTriangle size={13} />
                        ペナルティ
                      </button>
                      {canConvert && (
                        <button
                          onClick={() => setTimeConvertTarget({ id: u.id, name: u.displayName, accMin })}
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs text-white transition-all active:scale-95"
                          style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b", boxShadow: "0 2px 0 #0d2d6b" }}
                        >
                          <Timer size={13} />
                          時間→円
                        </button>
                      )}
                      {canCashout && (
                        <button
                          onClick={() => setCashoutTarget({ id: u.id, name: u.displayName, yenBalance: yenBal })}
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs text-white transition-all active:scale-95"
                          style={{ background: "var(--expo-green, #4DAD5B)", border: "2px solid #166534", boxShadow: "0 2px 0 #166534" }}
                        >
                          <Coins size={13} />
                          換金する
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
            <CategorySection category="chore" items={refChoreItems} readOnly />
            <CategorySection category="study" items={refStudyItems} readOnly />
            <CategorySection category="penalty" items={refPenaltyItems} readOnly defaultOpen={false} />
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

        {/* ペナルティ登録モーダル */}
        {penaltyTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "3px solid var(--expo-red)" }}>
              <div className="px-5 py-3 font-display text-white flex items-center gap-2" style={{ background: "var(--expo-red)" }}>
                <AlertTriangle size={16} />
                {penaltyTarget.name} のペナルティを記録
              </div>
              <form onSubmit={handlePenaltySubmit} className="p-5 space-y-4">
                {masterPenaltyItems.filter((i) => i.isActive).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">ペナルティ項目がありません</p>
                ) : (
                  <div>
                    <label className="block text-sm font-black mb-2" style={{ color: "var(--expo-red)" }}>ペナルティ項目</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl" style={{ border: "2px solid #fca5a5" }}>
                      {masterPenaltyItems.filter((i) => i.isActive).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPenaltyItemId(item.id === penaltyItemId ? "" : item.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-bold transition-colors"
                          style={penaltyItemId === item.id ? { background: "#fef2f2", color: "var(--expo-red)" } : {}}
                        >
                          <span>{item.name}</span>
                          <span className="font-black text-xs" style={{ color: "var(--expo-red)" }}>
                            {formatMin(item.effectiveMin)}
                            {item.mode === "PROPORTIONAL" && item.unitLabel ? `/${item.unitLabel}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {penaltyItemId && (() => {
                  const sel = masterPenaltyItems.find((i) => i.id === penaltyItemId);
                  if (!sel) return null;
                  const isProportional = sel.mode === "PROPORTIONAL";
                  const previewMin = isProportional
                    ? sel.effectiveMin * Math.max(1, Number(penaltyActualValue) || 1)
                    : sel.effectiveMin * Math.max(1, Number(penaltyCount) || 1);
                  return (
                    <div className="space-y-3">
                      {isProportional ? (
                        <div>
                          <label className="block text-sm font-black mb-1" style={{ color: "var(--expo-red)" }}>
                            {sel.unitLabel ?? "超過量"}
                          </label>
                          <input
                            type="number" min="1"
                            value={penaltyActualValue}
                            onChange={(e) => setPenaltyActualValue(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-sm font-bold focus:outline-none"
                            style={{ border: "2px solid #fca5a5" }}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-black mb-1" style={{ color: "var(--expo-red)" }}>回数</label>
                          <input
                            type="number" min="1" max="20"
                            value={penaltyCount}
                            onChange={(e) => setPenaltyCount(e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-sm font-bold focus:outline-none"
                            style={{ border: "2px solid #fca5a5" }}
                          />
                        </div>
                      )}
                      <p className="text-center text-sm font-black" style={{ color: "var(--expo-red)" }}>
                        ペナルティ: {formatMin(previewMin)}
                      </p>
                    </div>
                  );
                })()}
                <div>
                  <label className="block text-sm font-black mb-1" style={{ color: "var(--expo-red)" }}>発生日</label>
                  <input
                    type="date"
                    value={penaltyOccurredAt}
                    onChange={(e) => setPenaltyOccurredAt(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm font-bold focus:outline-none"
                    style={{ border: "2px solid #e5e7eb" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-black mb-1" style={{ color: "var(--expo-red)" }}>
                    理由 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={penaltyReason}
                    onChange={(e) => setPenaltyReason(e.target.value)}
                    placeholder="具体的な状況を書いてください"
                    rows={2}
                    required
                    className="w-full rounded-xl px-3 py-2 text-sm font-bold resize-none focus:outline-none"
                    style={{ border: "2px solid #fca5a5" }}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setPenaltyTarget(null)}
                    className="flex-1 py-3 rounded-xl font-black text-gray-600 active:scale-95"
                    style={{ border: "2px solid #d1d5db" }}>
                    キャンセル
                  </button>
                  <button type="submit"
                    disabled={penaltyLoading || !penaltyItemId || !penaltyReason.trim()}
                    className="flex-1 py-3 rounded-xl font-black text-white active:scale-95 disabled:opacity-50"
                    style={{ background: "var(--expo-red)", border: "2px solid #7f1d1d", boxShadow: "0 3px 0 #7f1d1d" }}>
                    {penaltyLoading ? "記録中..." : "記録する"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 換金確認モーダル */}
        {cashoutTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "3px solid #4DAD5B" }}>
              <div className="px-5 py-3 font-display text-white" style={{ background: "#4DAD5B" }}>
                {cashoutTarget.name} の換金
              </div>
              <div className="p-5 space-y-4">
                <div className="text-center py-3">
                  <p className="text-xs font-black text-gray-500 tracking-widest">現在の残高</p>
                  <p className="font-display text-3xl mt-1" style={{ color: cashoutTarget.yenBalance < 0 ? "var(--expo-red)" : "#4DAD5B" }}>
                    {cashoutTarget.yenBalance.toLocaleString()}円
                  </p>
                  {cashoutTarget.yenBalance >= CASHOUT_FEE && (
                    <p className="text-xs font-black text-gray-400 mt-1">
                      手数料{CASHOUT_FEE}円 → 受取 {(cashoutTarget.yenBalance - CASHOUT_FEE).toLocaleString()}円
                    </p>
                  )}
                  {cashoutTarget.yenBalance < 0 && (
                    <p className="text-xs font-black mt-1" style={{ color: "var(--expo-red)" }}>
                      マイナス残高（手数料なし）→ 負債 {cashoutTarget.yenBalance.toLocaleString()}円を記録
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCashoutTarget(null)}
                    className="flex-1 py-3 rounded-xl font-black text-gray-600 active:scale-95"
                    style={{ border: "2px solid #d1d5db" }}>
                    キャンセル
                  </button>
                  <button onClick={handleCashout} disabled={cashoutLoading}
                    className="flex-1 py-3 rounded-xl font-black text-white active:scale-95 disabled:opacity-50"
                    style={{ background: "#4DAD5B", border: "2px solid #166534", boxShadow: "0 3px 0 #166534" }}>
                    {cashoutLoading ? "処理中..." : "換金する"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 時間→円換算モーダル */}
        {timeConvertTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "3px solid var(--expo-blue)" }}>
              <div className="px-5 py-3 font-display text-white" style={{ background: "var(--expo-blue)" }}>
                {timeConvertTarget.name} の時間を換算
              </div>
              <div className="p-5 space-y-4">
                {(() => {
                  const { accMin } = timeConvertTarget;
                  const isNegative = accMin < 0;
                  const absMin = Math.abs(accMin);
                  const convertible = Math.floor(absMin / MINUTES_PER_UNIT) * MINUTES_PER_UNIT;
                  const yenResult = (convertible / MINUTES_PER_UNIT) * YEN_PER_UNIT * (isNegative ? -1 : 1);
                  return (
                    <>
                      <div className="text-center py-2">
                        <p className="text-xs font-black text-gray-500 tracking-widest">現在の時間残高</p>
                        <p className="font-display text-3xl mt-1" style={{ color: isNegative ? "var(--expo-red)" : "var(--expo-blue)" }}>
                          {formatMin(accMin)}
                        </p>
                        {isNegative && (
                          <p className="text-xs font-black mt-0.5" style={{ color: "var(--expo-red)" }}>マイナス残高</p>
                        )}
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: isNegative ? "#fef2f2" : "#eff6ff" }}>
                        <p className="text-xs font-black text-gray-500">換算量</p>
                        <p className="font-display text-xl mt-0.5" style={{ color: isNegative ? "var(--expo-red)" : "var(--expo-blue)" }}>
                          {formatMin(isNegative ? -convertible : convertible)} → {yenResult >= 0 ? "+" : ""}{yenResult.toLocaleString()}円
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {MINUTES_PER_UNIT}分 = {isNegative ? `-${YEN_PER_UNIT}円` : `+${YEN_PER_UNIT}円`}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setTimeConvertTarget(null)}
                          className="flex-1 py-3 rounded-xl font-black text-gray-600 active:scale-95"
                          style={{ border: "2px solid #d1d5db" }}>
                          キャンセル
                        </button>
                        <button onClick={handleTimeConvertForChild} disabled={timeConvertLoading || convertible < MINUTES_PER_UNIT}
                          className="flex-1 py-3 rounded-xl font-black text-white active:scale-95 disabled:opacity-50"
                          style={{ background: "var(--expo-blue)", border: "2px solid #0d2d6b", boxShadow: "0 3px 0 #0d2d6b" }}>
                          {timeConvertLoading ? "換算中..." : "換算する"}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 週次集計後→換金判断モーダル（改善3） */}
        {postSettleChildren.length > 0 && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: "3px solid #f59e0b" }}>
              <div className="px-5 py-3 font-display text-white" style={{ background: "#f59e0b" }}>
                換金する子を選んでください
              </div>
              <div className="p-5 space-y-3">
                {postSettleChildren.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={postSettleSelected.has(c.id)}
                      onChange={(e) => {
                        const next = new Set(postSettleSelected);
                        if (e.target.checked) next.add(c.id); else next.delete(c.id);
                        setPostSettleSelected(next);
                      }}
                      className="w-5 h-5 accent-amber-500"
                    />
                    <span className="font-black text-sm text-gray-800 dark:text-gray-100">{c.name}</span>
                    <span className="ml-auto font-black text-sm" style={{ color: "var(--expo-blue)" }}>
                      {formatYen(c.yenBalance)}
                    </span>
                  </label>
                ))}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setPostSettleChildren([])}
                    className="flex-1 py-3 rounded-xl font-black text-gray-600 text-sm active:scale-95"
                    style={{ border: "2px solid #d1d5db" }}
                  >
                    スキップ
                  </button>
                  <button
                    onClick={handlePostSettle}
                    disabled={postSettleSaving || postSettleSelected.size === 0}
                    className="flex-1 py-3 rounded-xl font-black text-white text-sm active:scale-95 disabled:opacity-50"
                    style={{ background: "#f59e0b", border: "2px solid #b45309" }}
                  >
                    {postSettleSaving ? "処理中..." : `${postSettleSelected.size}人を換金申請`}
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

          {/* 今日の残高詳細（改善1） */}
          {(todayTimePlus > 0 || todayTimeMinus > 0) && (
            <div className="flex items-center justify-center gap-4 px-4 py-2 rounded-xl text-xs font-black"
              style={{ background: "var(--expo-light-blue, #e0f0ff)" }}>
              <span style={{ color: "var(--expo-blue)" }}>今日</span>
              {todayTimePlus > 0 && <span style={{ color: "var(--expo-blue)" }}>+{formatMin(todayTimePlus)}</span>}
              {todayTimeMinus > 0 && <span style={{ color: "var(--expo-red)" }}>{formatSignedMin(-todayTimeMinus)}</span>}
            </div>
          )}

          <button
            onClick={() => { setShowSpendingForm(true); setSpendingAmount(""); setSpendingMemo(""); setSpendingCategory("food"); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95"
            style={{ background: "#f97316", border: "2px solid #c2410c", boxShadow: "0 2px 0 #c2410c" }}
          >
            <ShoppingBag size={15} />
            ＋使ったお金を記録する
          </button>

          {/* 時間換算フォーム（改善2） */}
          {balance && balance.accumulatedMin >= MINUTES_PER_UNIT && (() => {
            const maxUnits = Math.floor(balance.accumulatedMin / MINUTES_PER_UNIT);
            const safeUnits = Math.min(convertUnits, maxUnits);
            return (
              <div className="rounded-xl overflow-hidden" style={{ border: "2px solid var(--expo-blue)" }}>
                <button
                  onClick={() => { setConvertOpen((v) => !v); setConvertUnits(1); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 font-black text-sm text-white transition-all active:scale-95"
                  style={{ background: "var(--expo-blue)" }}
                >
                  <Timer size={15} />
                  時間を換算する（{MINUTES_PER_UNIT}分 = {YEN_PER_UNIT.toLocaleString()}円）
                  <ChevronDown size={14} className={`transition-transform ${convertOpen ? "rotate-180" : ""}`} />
                </button>
                {convertOpen && (
                  <div className="p-3 space-y-3 bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setConvertUnits((u) => Math.max(1, u - 1))}
                        disabled={safeUnits <= 1}
                        className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
                        style={{ background: "var(--expo-light-blue, #e0f0ff)", color: "var(--expo-blue)" }}
                      >
                        <Minus size={16} strokeWidth={3} />
                      </button>
                      <div className="text-center flex-1">
                        <p className="font-display text-lg" style={{ color: "var(--expo-blue)" }}>
                          {formatMin(safeUnits * MINUTES_PER_UNIT)}
                        </p>
                        <p className="text-xs font-black" style={{ color: "var(--expo-blue)" }}>
                          → {formatYen(safeUnits * YEN_PER_UNIT)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConvertUnits((u) => Math.min(maxUnits, u + 1))}
                        disabled={safeUnits >= maxUnits}
                        className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
                        style={{ background: "var(--expo-light-blue, #e0f0ff)", color: "var(--expo-blue)" }}
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </div>
                    <button
                      onClick={handleConvert}
                      disabled={convertSaving || safeUnits < 1}
                      className="w-full py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-50 transition-all active:scale-95"
                      style={{ background: "var(--expo-blue)" }}
                    >
                      {convertSaving ? "換算中..." : "換算する"}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
          <button
            onClick={() => router.push("/consume")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95"
            style={{ background: "var(--expo-red)", border: "2px solid #7f1d1d", boxShadow: "0 2px 0 #7f1d1d" }}
          >
            <Zap size={15} />
            時間を使う{todayConsumeMin > 0 ? `（今日 ${todayConsumeMin}分消費済み）` : ""}
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
                {formatSignedMin(weekMin)}
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
                  currentAmount={yenBalance}
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

        {/* クイック登録（改善7）: 最近使った項目 */}
        {recentItemIds.length > 0 && (() => {
          const allItems = [...choreItems, ...studyItems, ...penaltyItems];
          const recentItems = recentItemIds
            .map((id) => allItems.find((i) => i.id === id))
            .filter((i): i is Item => !!i);
          if (recentItems.length === 0) return null;
          return (
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: "2px solid #f59e0b" }}>
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "#f59e0b" }}>
                <span className="font-display text-white text-sm">さいきんつかった項目</span>
              </div>
              <div className="p-3 space-y-2 bg-amber-50 dark:bg-gray-800">
                {recentItems.map((item) => (
                  <ItemRow key={item.id} item={item} onRequest={(item) => setModal(item)} />
                ))}
              </div>
            </div>
          );
        })()}

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
                          {formatSignedMin(req.minutes)}
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
            if (modal && me) {
              try {
                const key = `recentItems_${me.id}`;
                const prev: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
                const next = [modal.id, ...prev.filter((id) => id !== modal.id)].slice(0, 5);
                localStorage.setItem(key, JSON.stringify(next));
                setRecentItemIds(next);
              } catch { /* ignore */ }
            }
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
