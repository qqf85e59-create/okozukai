import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/auth";

import { calculateStreak } from "@/lib/streak";

function weekOfMonth(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(url.searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const queryUserId = url.searchParams.get("userId");

  // 子供は自分のデータのみ
  const targetUserId = isChild(role) ? userId : (queryUserId ?? userId);

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1);

  // ── 勉強時間 週別集計 ──
  const studyThisMonth = await prisma.request.findMany({
    where: {
      userId: targetUserId,
      status: { in: ["approved", "settled"] },
      item: { category: "study" },
      requestedAt: { gte: startOfMonth, lt: endOfMonth },
    },
    select: { requestedAt: true, studyActualMin: true, minutes: true },
  });

  const weeklyMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const req of studyThisMonth) {
    const week = weekOfMonth(req.requestedAt.getDate());
    const min = req.studyActualMin != null && req.studyActualMin > 0
      ? req.studyActualMin
      : Math.max(req.minutes, 0);
    weeklyMap[week] += min;
  }

  const weeklyStudy = [1, 2, 3, 4].map((w) => ({
    week: w,
    label: `第${w}週`,
    minutes: weeklyMap[w],
  }));

  // ── 先月の勉強合計 ──
  const prevMonthStart = new Date(year, month - 2, 1);
  const prevMonthEnd = new Date(year, month - 1, 1);
  const studyPrevMonth = await prisma.request.findMany({
    where: {
      userId: targetUserId,
      status: { in: ["approved", "settled"] },
      item: { category: "study" },
      requestedAt: { gte: prevMonthStart, lt: prevMonthEnd },
    },
    select: { studyActualMin: true, minutes: true },
  });

  const studyTotal = Object.values(weeklyMap).reduce((a, b) => a + b, 0);
  const prevMonthStudyTotal = studyPrevMonth.reduce((sum, r) => {
    const min = r.studyActualMin != null && r.studyActualMin > 0
      ? r.studyActualMin
      : Math.max(r.minutes, 0);
    return sum + min;
  }, 0);

  // ── マイナス項目 月次集計 ──
  const minusRequests = await prisma.request.findMany({
    where: {
      userId: targetUserId,
      minutes: { lt: 0 },
      status: { in: ["approved", "settled"] },
      requestedAt: { gte: startOfMonth, lt: endOfMonth },
    },
    include: { item: { select: { name: true } } },
  });

  const itemMap: Record<string, { totalMin: number; count: number }> = {};
  for (const req of minusRequests) {
    const name = req.item.name;
    if (!itemMap[name]) itemMap[name] = { totalMin: 0, count: 0 };
    itemMap[name].totalMin += Math.abs(req.minutes);
    itemMap[name].count += 1;
  }

  const minusItems = Object.entries(itemMap)
    .map(([itemName, v]) => ({ itemName, ...v }))
    .sort((a, b) => b.totalMin - a.totalMin);

  // ── 集計額 過去6ヶ月 ──
  const sixMonthsAgo = new Date(year, month - 7, 1);
  const settlements = await prisma.settlementLog.findMany({
    where: {
      userId: targetUserId,
      settledAt: { gte: sixMonthsAgo, lt: endOfMonth },
    },
    orderBy: { settledAt: "asc" },
  });

  const monthlyMap: Record<string, number> = {};
  for (const log of settlements) {
    const key = `${log.settledAt.getFullYear()}-${String(log.settledAt.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = (monthlyMap[key] ?? 0) + log.convertedAmount;
  }

  const settlementHistory = Object.entries(monthlyMap).map(([key, amount]) => {
    const [y, m] = key.split("-");
    return { label: `${parseInt(m)}月`, amount, key };
  });

  // ── ストリーク ──
  const allStudyDates = await prisma.request.findMany({
    orderBy: { requestedAt: "desc" },
    where: {
      userId: targetUserId,
      status: { in: ["approved", "settled"] },
      item: { category: "study" },
      requestedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    },
  });

  const streak = calculateStreak(allStudyDates.map((r) => r.requestedAt));

  return NextResponse.json({
    weeklyStudy,
    minusItems,
    streak,
    studyTotal,
    prevMonthStudyTotal,
    settlementHistory,
  });
}
