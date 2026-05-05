import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateGrade } from "@/lib/grade";
import { isApprover } from "@/lib/auth";
import { calculateStreak } from "@/lib/streak";

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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { balance: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const grade = user.birthDate ? calculateGrade(user.birthDate) : null;

  const studyDates = await prisma.request.findMany({
    orderBy: { requestedAt: "desc" },
    where: {
      userId: user.id,
      status: { in: ["approved", "settled"] },
      item: { category: "study" },
      requestedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    },
  });

  const streak = calculateStreak(studyDates.map((r) => r.requestedAt));
  const yenBalance = user.balance?.virtualAmount ?? 0;

  return NextResponse.json({
    userId: user.id,
    displayName: user.displayName,
    grade,
    balance: user.balance,
    yenBalance,
    streak,
  });
}
