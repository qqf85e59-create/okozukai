import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bonuses = await prisma.scheduledBonus.findMany({
    include: { user: { select: { displayName: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(bonuses);
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, label, type, amountYen, dayOfMonth } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "定期ボーナス: 対象ユーザーを選択してください" }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "定期ボーナス: 名称を入力してください" }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: "定期ボーナス: 種類を選択してください" }, { status: 400 });
  }
  if (!amountYen || Number(amountYen) <= 0) {
    return NextResponse.json({ error: "定期ボーナス: 金額は1円以上で入力してください" }, { status: 400 });
  }

  const bonus = await prisma.scheduledBonus.create({
    data: { userId, label, type, amountYen: Number(amountYen), dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null },
  });
  return NextResponse.json(bonus, { status: 201 });
}
