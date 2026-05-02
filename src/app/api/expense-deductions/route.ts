import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");

  const deductions = await prisma.expenseDeduction.findMany({
    where: targetUserId ? { userId: targetUserId } : {},
    include: { user: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(deductions);
}

export async function POST(req: NextRequest) {
  const registeredBy = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!registeredBy) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, amount, reason } = await req.json();

  if (!userId || !amount || amount <= 0 || !reason?.trim()) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.expenseDeduction.create({
      data: { userId, amount: Number(amount), reason, registeredBy },
    });

    await tx.balance.update({
      where: { userId },
      data: {
        virtualAmount: { decrement: Number(amount) },
        totalDeducted: { increment: Number(amount) },
      },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
