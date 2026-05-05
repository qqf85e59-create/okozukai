import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ConsumeCategory } from "@/generated/prisma/client";

const VALID_CATEGORIES = Object.values(ConsumeCategory);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actorId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const record = await prisma.timeConsume.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { category, minutesUsed, memo } = body;

  const prevMinutes = record.minutesUsed;
  const newMinutes = minutesUsed != null ? Number(minutesUsed) : prevMinutes;
  const newCategory = (category && VALID_CATEGORIES.includes(category)) ? category as ConsumeCategory : record.category;

  if (newMinutes <= 0) return NextResponse.json({ error: "分数は1以上で入力してください" }, { status: 400 });

  const diff = newMinutes - prevMinutes;

  await prisma.timeConsume.update({
    where: { id },
    data: {
      category: newCategory,
      minutesUsed: newMinutes,
      memo: memo !== undefined ? (memo?.trim() || null) : record.memo,
    },
  });

  if (diff !== 0) {
    await prisma.balance.update({
      where: { userId: record.userId },
      data: { accumulatedMin: { decrement: diff } },
    });
  }

  await audit(actorId, "time-consume.edit", "TimeConsume", id, { prevMinutes, newMinutes, diff });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actorId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const record = await prisma.timeConsume.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.timeConsume.delete({ where: { id } });

  await prisma.balance.update({
    where: { userId: record.userId },
    data: { accumulatedMin: { increment: record.minutesUsed } },
  });

  await audit(actorId, "time-consume.delete", "TimeConsume", id, { minutesRestored: record.minutesUsed });

  return NextResponse.json({ ok: true });
}
