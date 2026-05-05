import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover, isChild } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { addYenLedger } from "@/lib/ledger";

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
  if (!userId) {
    return NextResponse.json({ error: "臨時収入: 対象ユーザーが指定されていません" }, { status: 400 });
  }
  if (!label?.trim()) {
    return NextResponse.json({ error: "臨時収入: 種類（名称）を入力してください" }, { status: 400 });
  }
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "臨時収入: 金額は1円以上で入力してください" }, { status: 400 });
  }

  // Note: prisma.$transaction(async callback) does not commit with the
  // better-sqlite3 adapter (v7.8.x), so we use sequential awaits instead.
  const record = await prisma.windfallIncome.create({
    data: {
      userId,
      amount: Number(amount),
      label: label.trim(),
      note: note?.trim() || null,
      recordedBy: actorId,
    },
  });
  await prisma.balance.upsert({
    where: { userId },
    update: { virtualAmount: { increment: Number(amount) } },
    create: { userId, virtualAmount: Number(amount) },
  });
  await addYenLedger(userId, Number(amount), "BONUS", { sourceId: record.id, note: label.trim() });
  await audit(actorId, "windfall.create", "WindfallIncome", record.id, { userId, amount: Number(amount), label });

  return NextResponse.json({ ok: true }, { status: 201 });
}
