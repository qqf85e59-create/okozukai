import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild, requireFamilyMember } from "@/lib/auth";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;

  const goal = await prisma.savingsGoal.findUnique({
    where: { id },
    include: { user: { select: { familyId: true } } },
  });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // CHILD は自分のゴールのみ、PARENT は同 family なら参照可
  if (isChild(role)) {
    if (goal.userId !== member.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    if (goal.user.familyId !== member.familyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  if (!goal.targetDate) {
    return NextResponse.json({ error: "targetDate が設定されていません" }, { status: 400 });
  }

  const now = new Date();
  const remainingMs = goal.targetDate.getTime() - now.getTime();
  const remainingDays = Math.max(1, Math.ceil(remainingMs / MS_PER_DAY));

  const balance = await prisma.balance.findUnique({
    where: { userId: goal.userId },
    select: { virtualAmount: true },
  });
  const currentSavings = balance?.virtualAmount ?? 0;

  const remainingAmount = Math.max(0, goal.targetAmount - currentSavings);
  const dailySuggestedAmount = Math.ceil(remainingAmount / remainingDays);
  const isAchieved = goal.isAchieved || currentSavings >= goal.targetAmount;

  // 計算結果をキャッシュ
  await prisma.savingsGoal.update({
    where: { id },
    data: { dailySuggestedAmount },
  });

  return NextResponse.json({
    remainingDays,
    remainingAmount,
    dailySuggestedAmount,
    isAchieved,
  });
}
