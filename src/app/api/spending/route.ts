import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild, isApprover } from "@/lib/auth";

const VALID_CATS = ["food", "toy", "game", "book", "outing", "other"];

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const queryUserId = url.searchParams.get("userId");
  const targetUserId = isChild(role) ? userId : (queryUserId ?? userId);

  const records = await prisma.spendingRecord.findMany({
    where: { userId: targetUserId },
    orderBy: { recordedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const targetUserId = isChild(role) ? userId : (body.userId ?? userId);
  const { amount, category, memo } = body;

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "支出記録: 金額は1円以上で入力してください" }, { status: 400 });
  }
  if (!VALID_CATS.includes(category)) {
    return NextResponse.json({ error: "支出記録: カテゴリを選択してください" }, { status: 400 });
  }

  // 残高確認
  const bal = await prisma.balance.findUnique({ where: { userId: targetUserId } });
  if (!bal || bal.virtualAmount < Number(amount)) {
    return NextResponse.json({ error: "残高が不足しています" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.spendingRecord.create({
      data: {
        userId: targetUserId,
        amount: Number(amount),
        category,
        memo: memo?.trim() || null,
      },
    });
    await tx.balance.update({
      where: { userId: targetUserId },
      data: { virtualAmount: { decrement: Number(amount) } },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
