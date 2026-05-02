"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { BarChart } from "@/components/BarChart";
import { LabelWithGloss } from "@/components/LabelWithGloss";
import { BarChart3, BookOpen, AlertTriangle, Wallet, Flame, Sprout, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";

type Me = { id: string; displayName: string; role: string };
type Child = { id: string; displayName: string };

type WeeklyStudy = { week: number; label: string; minutes: number };
type MinusItem = { itemName: string; totalMin: number; count: number };
type SettlementPoint = { label: string; amount: number; key: string };

type ReportData = {
  weeklyStudy: WeeklyStudy[];
  minusItems: MinusItem[];
  streak: number;
  studyTotal: number;
  prevMonthStudyTotal: number;
  settlementHistory: SettlementPoint[];
};

type DailyStat = { date: string; label: string; studyMin: number; taskCount: number; earnedMin: number };
type WeeklyData = {
  dailyStats: DailyStat[];
  weekTotal: { studyMin: number; taskCount: number; earnedMin: number };
  weekStart: string;
  weekEnd: string;
};

type MonthlyStat = { month: number; label: string; earnedYen: number; studyMin: number; taskCount: number };
type YearlyData = {
  monthlyStats: MonthlyStat[];
  totals: { earnedYen: number; studyMin: number; taskCount: number };
  year: number;
};

type Period = "week" | "month" | "year";

function formatMinutes(min: number) {
  if (min === 0) return "0分";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  return `${h}時間${m > 0 ? m + "分" : ""}`;
}

function formatAmount(amount: number) {
  return amount.toLocaleString("ja-JP") + "円";
}

function diffLabel(curr: number, prev: number) {
  const diff = curr - prev;
  if (diff === 0) return null;
  const sign = diff > 0 ? "+" : "";
  return { text: `${sign}${formatMinutes(diff)}`, up: diff > 0 };
}

const MINUS_COLORS = [
  "#F43F5E", "#FB923C", "#FBBF24", "#A78BFA", "#60A5FA",
  "#34D399", "#F472B6", "#94A3B8",
];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className ?? ""}`} />;
}

function PersonalBestBand({ userId }: { userId: string }) {
  const [data, setData] = useState<{ averageYenPerWeek: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/stats/personal-best?userId=${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, [userId]);

  if (!data) return null;

  return (
    <div
      className="rounded-2xl px-5 py-3 flex items-center gap-3 text-sm font-bold dark:bg-gray-800 dark:text-gray-200"
      style={{ background: "var(--expo-light-blue)" }}
    >
      <TrendingUp size={18} style={{ color: "var(--expo-blue)" }} className="dark:text-blue-400 shrink-0" />
      <span className="text-gray-700 dark:text-gray-200">
        週平均ペース: <span style={{ color: "var(--expo-blue)" }} className="dark:text-blue-400">{data.averageYenPerWeek.toLocaleString("ja-JP")}円/週</span>
      </span>
    </div>
  );
}

/* ── 月ビュー：既存の2×2グリッド ── */
function MonthView({ report, loading, studyDiff, minusTotal, currentUserId }: {
  report: ReportData | null;
  loading: boolean;
  studyDiff: ReturnType<typeof diffLabel>;
  minusTotal: number;
  currentUserId: string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 枠1: ストリーク */}
        <div className={`rounded-3xl p-5 shadow-md flex items-center gap-4 min-h-[120px] ${
          loading
            ? "bg-gray-200 dark:bg-gray-700"
            : (report?.streak ?? 0) > 0
              ? "bg-gradient-to-r from-orange-400 to-amber-400"
              : "bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600"
        }`}>
          {loading ? (
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : (
            <>
              {(report?.streak ?? 0) > 0
                ? <Flame size={44} className="text-white shrink-0" />
                : <Sprout size={44} className="text-white shrink-0" />
              }
              <div>
                <p className="text-white font-black text-2xl">
                  {(report?.streak ?? 0) > 0 ? `${report!.streak}日連続！` : "これから始めよう"}
                </p>
                <p className="text-white/80 text-sm font-bold">べんきょうのストリーク</p>
              </div>
            </>
          )}
        </div>

        {/* 枠2: 勉強時間 */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col min-h-[240px]">
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
            <BookOpen size={18} />
            べんきょう時間
          </h2>
          {loading ? (
            <div className="flex-1 space-y-3 pt-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="flex-1 h-[150px]" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-black text-indigo-700 dark:text-indigo-400">
                  {formatMinutes(report?.studyTotal ?? 0)}
                </span>
                {studyDiff && (
                  <span className={`text-sm font-bold flex items-center gap-1 ${studyDiff.up ? "text-emerald-600" : "text-rose-500"}`}>
                    {studyDiff.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />} 先月比 {studyDiff.text}
                  </span>
                )}
                {!studyDiff && (
                  <span className="text-sm text-gray-400 dark:text-gray-300">先月と同じ</span>
                )}
              </div>
              <div className="flex-1 min-h-[150px]">
                <BarChart
                  data={(report?.weeklyStudy ?? []).map((w) => ({ label: w.label, value: w.minutes }))}
                  color="#6366F1"
                  formatValue={(v) => formatMinutes(v)}
                  emptyLabel="今月の記録がありません"
                />
              </div>
            </>
          )}
        </div>

        {/* 枠3: マイナス申請 */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col min-h-[240px]">
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
            <AlertTriangle size={18} />
            マイナス申請
          </h2>
          {loading ? (
            <div className="flex-1 space-y-3 pt-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (report?.minusItems ?? []).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-6">
              今月のマイナス申請はありません
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                合計 <span className="font-black text-rose-600">{formatMinutes(minusTotal)}</span> のマイナス（{report!.minusItems.reduce((s, i) => s + i.count, 0)}回）
              </p>
              <div className="space-y-3 flex-1">
                {report!.minusItems.map((item, i) => {
                  const pct = minusTotal > 0 ? (item.totalMin / minusTotal) * 100 : 0;
                  const color = MINUS_COLORS[i % MINUS_COLORS.length];
                  return (
                    <div key={item.itemName}>
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate flex-1 mr-2">
                          {item.itemName}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-300 shrink-0">
                          -{formatMinutes(item.totalMin)}（{item.count}回）
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 枠4: 集計額の推移 */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col min-h-[240px]">
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Wallet size={18} />
            集計額の推移
          </h2>
          {loading ? (
            <Skeleton className="flex-1 h-[150px]" />
          ) : (
            <div className="flex-1 min-h-[150px]">
              <BarChart
                data={(report?.settlementHistory ?? []).map((s) => ({ label: s.label, value: s.amount }))}
                color="#4F46E5"
                formatValue={(v) => formatAmount(v)}
                emptyLabel="集計データがありません"
              />
            </div>
          )}
        </div>
      </div>
      {!loading && currentUserId && <PersonalBestBand userId={currentUserId} />}
    </>
  );
}

/* ── 週ビュー ── */
function WeekView({ data, loading }: { data: WeeklyData | null; loading: boolean }) {
  const total = data?.weekTotal;
  return (
    <div className="space-y-5">
      {/* サマリーカード3枚 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "勉強時間", value: loading ? "—" : formatMinutes(total?.studyMin ?? 0), color: "#6366F1" },
          { label: "タスク数", value: loading ? "—" : `${total?.taskCount ?? 0}件`, color: "#10b981" },
          { label: "獲得分", value: loading ? "—" : `${total?.earnedMin ?? 0}分`, color: "#f59e0b" },
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
            <p className="font-black text-lg" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* 日別棒グラフ */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <BookOpen size={18} />
          日別べんきょう時間
        </h2>
        {loading ? (
          <Skeleton className="h-[150px] w-full" />
        ) : (
          <div className="min-h-[150px]">
            <BarChart
              data={(data?.dailyStats ?? []).map((d) => ({ label: d.label, value: d.studyMin }))}
              color="#6366F1"
              formatValue={(v) => formatMinutes(v)}
              emptyLabel="今週の記録がありません"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 年ビュー ── */
function YearView({ data, loading }: { data: YearlyData | null; loading: boolean }) {
  const totals = data?.totals;
  return (
    <div className="space-y-5">
      {/* サマリーカード3枚 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "年間収入", value: loading ? "—" : formatAmount(totals?.earnedYen ?? 0), color: "#4F46E5" },
          { label: "総勉強時間", value: loading ? "—" : formatMinutes(totals?.studyMin ?? 0), color: "#6366F1" },
          { label: "タスク達成", value: loading ? "—" : `${totals?.taskCount ?? 0}件`, color: "#10b981" },
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
            <p className="font-black text-base" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* 月別棒グラフ */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Wallet size={18} />
          月別集計額
        </h2>
        {loading ? (
          <Skeleton className="h-[150px] w-full" />
        ) : (
          <div className="min-h-[150px]">
            <BarChart
              data={(data?.monthlyStats ?? []).map((m) => ({ label: m.label, value: m.earnedYen }))}
              color="#4F46E5"
              formatValue={(v) => formatAmount(v)}
              emptyLabel="今年の集計データがありません"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PC用マルチカラム（親ビュー・lg+） ── */
function ChildReportColumn({ child, report, loading }: { child: Child; report: ReportData | undefined; loading: boolean }) {
  const minusTotal = report?.minusItems.reduce((s, i) => s + i.totalMin, 0) ?? 0;
  const studyDiff = report ? diffLabel(report.studyTotal, report.prevMonthStudyTotal) : null;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-base text-center py-2 rounded-xl text-white" style={{ background: "var(--expo-blue)" }}>
        {child.displayName}
      </h3>

      {/* ストリーク */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 min-h-[80px] ${
        loading
          ? "bg-gray-200 dark:bg-gray-700"
          : (report?.streak ?? 0) > 0
            ? "bg-gradient-to-r from-orange-400 to-amber-400"
            : "bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600"
      }`}>
        {loading ? <Skeleton className="h-6 w-24" /> : (
          <>
            {(report?.streak ?? 0) > 0 ? <Flame size={28} className="text-white shrink-0" /> : <Sprout size={28} className="text-white shrink-0" />}
            <p className="text-white font-black text-lg">
              {(report?.streak ?? 0) > 0 ? `${report!.streak}日連続！` : "これから"}
            </p>
          </>
        )}
      </div>

      {/* 勉強時間 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h4 className="text-sm font-black text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1">
          <BookOpen size={14} /> べんきょう時間
        </h4>
        {loading ? <Skeleton className="h-[120px]" /> : (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
                {formatMinutes(report?.studyTotal ?? 0)}
              </span>
              {studyDiff && (
                <span className={`text-xs font-bold ${studyDiff.up ? "text-emerald-600" : "text-rose-500"}`}>
                  {studyDiff.up ? <TrendingUp size={11} className="inline" /> : <TrendingDown size={11} className="inline" />} {studyDiff.text}
                </span>
              )}
            </div>
            <div className="min-h-[100px]">
              <BarChart
                data={(report?.weeklyStudy ?? []).map((w) => ({ label: w.label, value: w.minutes }))}
                color="#6366F1"
                formatValue={(v) => formatMinutes(v)}
                emptyLabel="記録なし"
              />
            </div>
          </>
        )}
      </div>

      {/* マイナス申請 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h4 className="text-sm font-black text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1">
          <AlertTriangle size={14} /> マイナス申請
        </h4>
        {loading ? <Skeleton className="h-20" /> : (report?.minusItems ?? []).length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">なし</p>
        ) : (
          <div className="space-y-2">
            {report!.minusItems.slice(0, 3).map((item, i) => {
              const pct = minusTotal > 0 ? (item.totalMin / minusTotal) * 100 : 0;
              return (
                <div key={item.itemName}>
                  <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300 mb-0.5">
                    <span className="truncate mr-1">{item.itemName}</span>
                    <span className="shrink-0">-{formatMinutes(item.totalMin)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: MINUS_COLORS[i % MINUS_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 集計額 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h4 className="text-sm font-black text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1">
          <Wallet size={14} /> 集計額の推移
        </h4>
        {loading ? <Skeleton className="h-[100px]" /> : (
          <div className="min-h-[100px]">
            <BarChart
              data={(report?.settlementHistory ?? []).map((s) => ({ label: s.label, value: s.amount }))}
              color="#4F46E5"
              formatValue={(v) => formatAmount(v)}
              emptyLabel="データなし"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [period, setPeriod] = useState<Period>("month");

  // 月ビューデータ
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // 週ビューデータ
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [weekBaseDate, setWeekBaseDate] = useState(now.toISOString().slice(0, 10));

  // 年ビューデータ
  const [yearlyData, setYearlyData] = useState<YearlyData | null>(null);
  const [loadingYear, setLoadingYear] = useState(false);
  const [reportYear, setReportYear] = useState(now.getFullYear());

  // 親用マルチカラム
  const [allReports, setAllReports] = useState<Record<string, ReportData>>({});
  const [loadingAll, setLoadingAll] = useState(false);

  const isParent = me?.role === "approver" || me?.role === "admin";
  const currentUserId = me?.role === "child" ? (me?.id ?? "") : selectedChild;

  const fetchReport = useCallback(async (targetUserId: string) => {
    setLoadingMonth(true);
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (targetUserId) params.set("userId", targetUserId);
    const res = await fetch(`/api/report/monthly?${params}`);
    if (res.ok) setReport(await res.json());
    setLoadingMonth(false);
  }, [year, month]);

  const fetchAllReports = useCallback(async (kids: Child[]) => {
    if (kids.length === 0) return;
    setLoadingAll(true);
    const results = await Promise.all(
      kids.map((c) =>
        fetch(`/api/report/monthly?year=${year}&month=${month}&userId=${c.id}`)
          .then((r) => r.json())
          .then((data) => [c.id, data] as [string, ReportData])
      )
    );
    setAllReports(Object.fromEntries(results));
    setLoadingAll(false);
  }, [year, month]);

  const fetchWeekly = useCallback(async (targetUserId: string) => {
    setLoadingWeek(true);
    const params = new URLSearchParams({ date: weekBaseDate });
    if (targetUserId) params.set("userId", targetUserId);
    const res = await fetch(`/api/report/weekly?${params}`);
    if (res.ok) setWeeklyData(await res.json());
    setLoadingWeek(false);
  }, [weekBaseDate]);

  const fetchYearly = useCallback(async (targetUserId: string) => {
    setLoadingYear(true);
    const params = new URLSearchParams({ year: String(reportYear) });
    if (targetUserId) params.set("userId", targetUserId);
    const res = await fetch(`/api/report/yearly?${params}`);
    if (res.ok) setYearlyData(await res.json());
    setLoadingYear(false);
  }, [reportYear]);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/"); return; }
      const meData: Me = await meRes.json();
      setMe(meData);

      if (meData.role !== "child") {
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const users = await usersRes.json();
          const kids: Child[] = users.filter((u: { role: string }) => u.role === "child");
          setChildren(kids);
          if (kids.length > 0) {
            setSelectedChild(kids[0].id);
            fetchReport(kids[0].id);
            fetchAllReports(kids);
            return;
          }
        }
      }
      fetchReport(meData.id);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 月変更時に月ビューとマルチカラムを再取得
  useEffect(() => {
    if (!me) return;
    if (period === "month") {
      const target = me.role === "child" ? me.id : selectedChild;
      if (target) fetchReport(target);
      if (isParent && children.length > 0) fetchAllReports(children);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, selectedChild, me]);

  // 週変更
  useEffect(() => {
    if (!me || period !== "week") return;
    const target = me.role === "child" ? me.id : selectedChild;
    if (target) fetchWeekly(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekBaseDate, selectedChild, me, period]);

  // 年変更
  useEffect(() => {
    if (!me || period !== "year") return;
    const target = me.role === "child" ? me.id : selectedChild;
    if (target) fetchYearly(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportYear, selectedChild, me, period]);

  // タブ切替時に初回データ取得
  useEffect(() => {
    if (!me) return;
    const target = me.role === "child" ? me.id : selectedChild;
    if (!target) return;
    if (period === "week" && !weeklyData) fetchWeekly(target);
    if (period === "year" && !yearlyData) fetchYearly(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const studyDiff = report ? diffLabel(report.studyTotal, report.prevMonthStudyTotal) : null;
  const minusTotal = report?.minusItems.reduce((s, i) => s + i.totalMin, 0) ?? 0;

  // 週ナビ
  const handlePrevWeek = () => {
    const d = new Date(weekBaseDate);
    d.setDate(d.getDate() - 7);
    setWeekBaseDate(d.toISOString().slice(0, 10));
  };
  const handleNextWeek = () => {
    const d = new Date(weekBaseDate);
    d.setDate(d.getDate() + 7);
    const today = now.toISOString().slice(0, 10);
    if (d.toISOString().slice(0, 10) <= today) setWeekBaseDate(d.toISOString().slice(0, 10));
  };
  const isCurrentWeek = (() => {
    const d = new Date(weekBaseDate);
    const t = new Date(now);
    const dayD = d.getDay(); const diff = dayD === 0 ? -6 : 1 - dayD;
    d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0);
    const dayT = t.getDay(); const diffT = dayT === 0 ? -6 : 1 - dayT;
    t.setDate(t.getDate() + diffT); t.setHours(0, 0, 0, 0);
    return d.getTime() === t.getTime();
  })();

  if (!me) return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;

  const weekLabel = (() => {
    if (!weeklyData) return weekBaseDate;
    const ws = new Date(weeklyData.weekStart);
    const we = new Date(weeklyData.weekEnd);
    we.setDate(we.getDate() - 1);
    return `${ws.getMonth() + 1}/${ws.getDate()}〜${we.getMonth() + 1}/${we.getDate()}`;
  })();

  return (
    <div className="lg:pl-64 min-h-screen">
      <Nav role={me.role} displayName={me.displayName} />
      <main className="p-4 pb-24 lg:pb-8 space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-display flex items-center gap-2" style={{ color: "var(--expo-blue)" }}>
            <BarChart3 size={24} />
            レポート
          </h1>

          {/* ナビ（期間に応じて変わる） */}
          {period === "month" && (
            <div className="flex items-center gap-2">
              <button onClick={() => { if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1); }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 min-w-[80px] text-center">{year}年{month}月</span>
              <button onClick={() => { if (isCurrentMonth) return; if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1); }}
                disabled={isCurrentMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {period === "week" && (
            <div className="flex items-center gap-2">
              <button onClick={handlePrevWeek}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 min-w-[120px] text-center">{weekLabel}</span>
              <button onClick={handleNextWeek} disabled={isCurrentWeek}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {period === "year" && (
            <div className="flex items-center gap-2">
              <button onClick={() => setReportYear((y) => y - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 min-w-[70px] text-center">{reportYear}年</span>
              <button onClick={() => setReportYear((y) => y + 1)} disabled={reportYear >= now.getFullYear()}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* 週/月/年 タブ */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="flex-1 py-2 rounded-lg text-sm font-black transition-all"
              style={period === p
                ? { background: "var(--expo-blue)", color: "white" }
                : { color: "#6b7280" }}
            >
              {p === "week" ? "週" : p === "month" ? "月" : "年"}
            </button>
          ))}
        </div>

        {/* 子供セレクタ（親・モバイル/タブレット） */}
        {isParent && children.length > 0 && (
          <div className={period === "month" ? "lg:hidden" : ""}>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm min-h-[44px] bg-white dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-200 shadow-sm w-full"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── 週ビュー ── */}
        {period === "week" && <WeekView data={weeklyData} loading={loadingWeek} />}

        {/* ── 月ビュー ── */}
        {period === "month" && (
          <>
            {/* モバイル/タブレット：1人選択表示 */}
            <div className={isParent && children.length > 1 ? "lg:hidden" : ""}>
              <MonthView
                report={report}
                loading={loadingMonth}
                studyDiff={studyDiff}
                minusTotal={minusTotal}
                currentUserId={currentUserId}
              />
            </div>

            {/* lg+：親ビューはマルチカラム */}
            {isParent && children.length > 1 && (
              <div
                className="hidden lg:grid gap-6"
                style={{ gridTemplateColumns: `repeat(${Math.min(children.length, 4)}, 1fr)` }}
              >
                {children.map((c) => (
                  <ChildReportColumn
                    key={c.id}
                    child={c}
                    report={allReports[c.id]}
                    loading={loadingAll || !allReports[c.id]}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 年ビュー ── */}
        {period === "year" && <YearView data={yearlyData} loading={loadingYear} />}

      </main>
    </div>
  );
}
