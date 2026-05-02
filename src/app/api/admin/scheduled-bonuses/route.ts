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
  if (!userId || !label || !type || !amountYen) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const bonus = await prisma.scheduledBonus.create({
    data: { userId, label, type, amountYen: Number(amountYen), dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null },
  });
  return NextResponse.json(bonus, { status: 201 });
}
