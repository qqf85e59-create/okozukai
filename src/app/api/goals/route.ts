import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isChild(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, targetAmount, memo, targetDate } = await req.json();
  if (!title || !targetAmount) {
    return NextResponse.json({ error: "タイトルと目標金額は必須です" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      title,
      targetAmount: Number(targetAmount),
      memo,
      targetDate: targetDate ? new Date(targetDate) : null,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
