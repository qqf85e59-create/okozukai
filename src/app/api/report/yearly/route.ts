import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()));
  const queryUserId = url.searchParams.get("userId");
  const targetUserId = isChild(role) ? userId : (queryUserId ?? userId);

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  const [settlements, studyRequests, allRequests] = await Promise.all([
    prisma.settlementLog.findMany({
      where: { userId: targetUserId, settledAt: { gte: startOfYear, lt: endOfYear } },
      select: { settledAt: true, convertedAmount: true },
    }),
    prisma.request.findMany({
      where: {
        userId: targetUserId,
        status: { in: ["approved", "settled"] },
        item: { category: "study" },
        requestedAt: { gte: startOfYear, lt: endOfYear },
      },
      select: { requestedAt: true, studyActualMin: true, minutes: true },
    }),
    prisma.request.findMany({
      where: {
        userId: targetUserId,
        status: { in: ["approved", "settled"] },
        requestedAt: { gte: startOfYear, lt: endOfYear },
      },
      select: { requestedAt: true },
    }),
  ]);

  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month,
      label: `${month}月`,
      earnedYen: 0,
      studyMin: 0,
      taskCount: 0,
    };
  });

  for (const s of settlements) {
    const m = new Date(s.settledAt).getMonth();
    monthlyStats[m].earnedYen += s.convertedAmount;
  }
  for (const r of studyRequests) {
    const m = new Date(r.requestedAt).getMonth();
    const min = r.studyActualMin && r.studyActualMin > 0 ? r.studyActualMin : Math.max(r.minutes, 0);
    monthlyStats[m].studyMin += min;
  }
  for (const r of allRequests) {
    const m = new Date(r.requestedAt).getMonth();
    monthlyStats[m].taskCount += 1;
  }

  const totals = {
    earnedYen: monthlyStats.reduce((s, m) => s + m.earnedYen, 0),
    studyMin: monthlyStats.reduce((s, m) => s + m.studyMin, 0),
    taskCount: monthlyStats.reduce((s, m) => s + m.taskCount, 0),
  };

  return NextResponse.json({ monthlyStats, totals, year });
}
