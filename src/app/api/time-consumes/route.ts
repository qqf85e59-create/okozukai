import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild, isApprover } from "@/lib/auth";
import { consumeTime } from "@/lib/ledger";
import { audit } from "@/lib/audit";
import { notifyParents } from "@/lib/push";
import { ConsumeCategory } from "@/generated/prisma/client";

const VALID_CATEGORIES = Object.values(ConsumeCategory);

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = isChild(role) ? userId : (url.searchParams.get("userId") ?? userId);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const consumes = await prisma.timeConsume.findMany({
    where: {
      userId: targetUserId,
      ...(from || to
        ? {
            consumedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { consumedAt: "desc" },
    take: 200,
  });
  return NextResponse.json(consumes);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isChild(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { category, minutesUsed, memo } = body;

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "カテゴリが不正です" }, { status: 400 });
  }
  if (!minutesUsed || Number(minutesUsed) <= 0) {
    return NextResponse.json({ error: "分数は1以上で入力してください" }, { status: 400 });
  }

  try {
    const prevBalance = await prisma.balance.findUnique({ where: { userId }, select: { accumulatedMin: true } });
    const id = await consumeTime(userId, category as ConsumeCategory, Number(minutesUsed), memo?.trim());
    const newBalance = await prisma.balance.findUnique({ where: { userId }, select: { accumulatedMin: true } });
    await audit(userId, "time-consume.create", "TimeConsume", id, { category, minutesUsed, memo });
    if ((prevBalance?.accumulatedMin ?? 0) > 0 && (newBalance?.accumulatedMin ?? 0) <= 0) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
      await notifyParents({
        title: "残高がマイナスになりました",
        body: `${user?.displayName ?? ""}の時間残高がマイナスになりました`,
        url: "/home",
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "登録に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
