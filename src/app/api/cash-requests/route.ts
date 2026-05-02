import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild, isApprover } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where: Record<string, unknown> = {};
  if (isChild(role)) where.userId = userId;

  const requests = await prisma.cashRequest.findMany({
    where,
    include: { user: { select: { id: true, displayName: true } } },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isChild(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { amount } = await req.json();

  if (!amount || amount <= 0 || amount % 500 !== 0) {
    return NextResponse.json({ error: "金額は500円単位で入力してください" }, { status: 400 });
  }

  const balance = await prisma.balance.findUnique({ where: { userId } });
  if (!balance) return NextResponse.json({ error: "残高情報が見つかりません" }, { status: 404 });

  if (balance.virtualAmount < 0) {
    return NextResponse.json({ error: "借金中は現金化申請できません" }, { status: 400 });
  }

  const fee = 500;
  const totalRequired = amount + fee;

  if (balance.virtualAmount < totalRequired) {
    return NextResponse.json(
      { error: `残高不足です（必要額: ${totalRequired}円、現在: ${balance.virtualAmount}円）` },
      { status: 400 }
    );
  }

  const cashRequest = await prisma.cashRequest.create({
    data: { userId, amount, fee },
  });

  return NextResponse.json(cashRequest, { status: 201 });
}
