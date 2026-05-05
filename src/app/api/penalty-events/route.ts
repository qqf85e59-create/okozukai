import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover, isChild } from "@/lib/auth";
import { resolvePenaltyMinutes } from "@/lib/items";
import { addTimeLedger } from "@/lib/ledger";
import { notifyUser, notifyParents } from "@/lib/push";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");

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
  if (isChild(role)) {
    where.userId = userId;
  } else if (targetUserId) {
    where.userId = targetUserId;
  }

  const events = await prisma.penaltyEvent.findMany({
    where,
    include: {
      user: { select: { id: true, displayName: true } },
      penaltyItem: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const createdById = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, penaltyItemId, count = 1, actualValue, occurredAt, reason } = body;
  if (!userId || !penaltyItemId) {
    return NextResponse.json({ error: "userId and penaltyItemId are required" }, { status: 400 });
  }
  if (!reason?.trim()) return NextResponse.json({ error: "reason is required" }, { status: 400 });

  const [actorUser, targetUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: createdById }, select: { familyId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { familyId: true } }),
  ]);
  if (!actorUser || !targetUser || actorUser.familyId !== targetUser.familyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.penaltyItem.findUnique({ where: { id: penaltyItemId } });
  if (!item) return NextResponse.json({ error: "PenaltyItem not found" }, { status: 404 });

  const baseMin = await resolvePenaltyMinutes(userId, penaltyItemId);
  if (baseMin === null) return NextResponse.json({ error: "Item not available for this user" }, { status: 400 });

  let totalMinutes: number;
  if (item.mode === "PROPORTIONAL") {
    if (!actualValue || actualValue <= 0) {
      return NextResponse.json({ error: "actualValue required for PROPORTIONAL mode" }, { status: 400 });
    }
    totalMinutes = baseMin * Number(actualValue);
  } else {
    totalMinutes = baseMin * Number(count);
  }

  const event = await prisma.penaltyEvent.create({
    data: {
      userId,
      penaltyItemId,
      count: Number(count),
      actualValue: actualValue ? Number(actualValue) : null,
      totalMinutes,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      reason: reason.trim(),
      createdById,
    },
    include: {
      user: { select: { displayName: true } },
      penaltyItem: { select: { name: true } },
    },
  });

  const prevBalance = await prisma.balance.findUnique({ where: { userId }, select: { accumulatedMin: true } });
  await addTimeLedger(userId, -totalMinutes, "PENALTY", "PENALTY_EVENT", { sourceId: event.id });
  const updated = await prisma.balance.update({
    where: { userId },
    data: { accumulatedMin: { decrement: totalMinutes } },
    select: { accumulatedMin: true },
  });
  await notifyUser(userId, {
    title: "ペナルティが記録されました",
    body: `「${event.penaltyItem.name}」△${totalMinutes}分が記録されました`,
    url: "/requests",
  });
  if ((prevBalance?.accumulatedMin ?? 0) > 0 && updated.accumulatedMin <= 0) {
    await notifyParents({
      title: "残高がマイナスになりました",
      body: `${event.user.displayName}の時間残高がマイナスになりました`,
      url: "/home",
    });
  }
  await audit(createdById, "penalty-event.create", "PenaltyEvent", event.id, {
    userId,
    totalMinutes,
    reason: reason.trim(),
  });

  return NextResponse.json(event, { status: 201 });
}
