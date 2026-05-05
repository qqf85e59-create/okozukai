import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild, isApprover } from "@/lib/auth";
import { resolveBonusMinutes } from "@/lib/items";
import { notifyParents } from "@/lib/push";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  const status = url.searchParams.get("status");

  if (!isChild(role) && targetUserId && targetUserId !== userId) {
    const [actor, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { familyId: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { familyId: true } }),
    ]);
    if (!actor || !target || actor.familyId !== target.familyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (isChild(role)) {
    where.userId = userId;
  } else if (targetUserId) {
    where.userId = targetUserId;
  }

  const claims = await prisma.choreClaim.findMany({
    where,
    include: {
      user: { select: { id: true, displayName: true } },
      choreItem: { select: { id: true, name: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(claims);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isChild(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { choreItemId, count = 1, actualValue, note, performedAt } = body;
  if (!choreItemId) return NextResponse.json({ error: "choreItemId is required" }, { status: 400 });
  if (count < 1 || count > 20) return NextResponse.json({ error: "count must be 1–20" }, { status: 400 });

  const baseMin = await resolveBonusMinutes(userId, choreItemId);
  if (baseMin === null) return NextResponse.json({ error: "Item not available for this user" }, { status: 400 });

  const choreItem = await prisma.choreItem.findUnique({ where: { id: choreItemId }, select: { mode: true } });
  const isProportional = choreItem?.mode === "PROPORTIONAL";
  const resolvedActualValue = isProportional ? Math.max(1, Number(actualValue) || 1) : undefined;
  const totalMinutes = isProportional
    ? baseMin * (resolvedActualValue ?? 1)
    : baseMin * Number(count);

  const claim = await prisma.choreClaim.create({
    data: {
      userId,
      choreItemId,
      count: isProportional ? 1 : Number(count),
      actualValue: resolvedActualValue ?? null,
      totalMinutes,
      performedAt: performedAt ? new Date(performedAt) : new Date(),
      note: note?.trim() || null,
    },
    include: {
      user: { select: { displayName: true } },
      choreItem: { select: { name: true } },
    },
  });

  await notifyParents({
    title: "おてつだいの申請が届きました",
    body: `${claim.user.displayName} が「${claim.choreItem.name}」×${count} を申請しました`,
    url: "/approvals",
  });

  return NextResponse.json(claim, { status: 201 });
}
