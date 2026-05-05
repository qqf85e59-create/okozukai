import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const requesterId = req.headers.get("x-user-id");
  const requesterRole = req.headers.get("x-user-role");

  if (!requesterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(requesterRole ?? "") && requesterId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [timePlus, timeMinus, yenPlus, yenMinus] = await Promise.all([
    prisma.timeLedger.aggregate({
      where: { userId, createdAt: { gte: todayStart }, deltaMinutes: { gt: 0 } },
      _sum: { deltaMinutes: true },
    }),
    prisma.timeLedger.aggregate({
      where: { userId, createdAt: { gte: todayStart }, deltaMinutes: { lt: 0 } },
      _sum: { deltaMinutes: true },
    }),
    prisma.yenLedger.aggregate({
      where: { userId, createdAt: { gte: todayStart }, deltaYen: { gt: 0 } },
      _sum: { deltaYen: true },
    }),
    prisma.yenLedger.aggregate({
      where: { userId, createdAt: { gte: todayStart }, deltaYen: { lt: 0 } },
      _sum: { deltaYen: true },
    }),
  ]);

  return NextResponse.json({
    todayTimePlus: timePlus._sum?.deltaMinutes ?? 0,
    todayTimeMinus: Math.abs(timeMinus._sum?.deltaMinutes ?? 0),
    todayYenPlus: yenPlus._sum?.deltaYen ?? 0,
    todayYenMinus: Math.abs(yenMinus._sum?.deltaYen ?? 0),
  });
}
