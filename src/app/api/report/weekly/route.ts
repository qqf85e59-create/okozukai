import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/auth";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const queryUserId = url.searchParams.get("userId");
  const targetUserId = isChild(role) ? userId : (queryUserId ?? userId);

  const baseDate = dateParam ? new Date(dateParam) : new Date();
  // 月曜始まりの週開始を計算
  const day = baseDate.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() + diffToMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const requests = await prisma.request.findMany({
    where: {
      userId: targetUserId,
      status: { in: ["approved", "settled"] },
      requestedAt: { gte: weekStart, lt: weekEnd },
    },
    select: {
      requestedAt: true,
      minutes: true,
      studyActualMin: true,
      item: { select: { category: true } },
    },
  });

  // 7日分の初期化（月〜日）
  const dailyMap: Record<string, { studyMin: number; taskCount: number; earnedMin: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dailyMap[d.toISOString().slice(0, 10)] = { studyMin: 0, taskCount: 0, earnedMin: 0 };
  }

  for (const r of requests) {
    const key = new Date(r.requestedAt).toISOString().slice(0, 10);
    if (!dailyMap[key]) continue;
    dailyMap[key].taskCount += 1;
    const min = r.minutes;
    if (min > 0) dailyMap[key].earnedMin += min;
    if (r.item.category === "study") {
      dailyMap[key].studyMin += r.studyActualMin && r.studyActualMin > 0 ? r.studyActualMin : Math.max(min, 0);
    }
  }

  const dailyStats = Object.entries(dailyMap).map(([date, v]) => ({
    date,
    label: DAY_LABELS[new Date(date + "T00:00:00").getDay()],
    ...v,
  }));

  const weekTotal = {
    studyMin: dailyStats.reduce((s, d) => s + d.studyMin, 0),
    taskCount: dailyStats.reduce((s, d) => s + d.taskCount, 0),
    earnedMin: dailyStats.reduce((s, d) => s + d.earnedMin, 0),
  };

  return NextResponse.json({ dailyStats, weekTotal, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() });
}
