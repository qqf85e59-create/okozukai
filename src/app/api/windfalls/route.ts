import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover, isChild } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const queryUserId = url.searchParams.get("userId");
  const targetUserId = isChild(role) ? userId : (queryUserId ?? userId);

  const records = await prisma.windfallIncome.findMany({
    where: { userId: targetUserId },
    orderBy: { recordedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const actorId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, amount, label, note } = await req.json();
  if (!userId || !label?.trim() || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.windfallIncome.create({
      data: {
        userId,
        amount: Number(amount),
        label: label.trim(),
        note: note?.trim() || null,
        recordedBy: actorId,
      },
    });
    await tx.balance.upsert({
      where: { userId },
      update: { virtualAmount: { increment: Number(amount) } },
      create: { userId, virtualAmount: Number(amount) },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
