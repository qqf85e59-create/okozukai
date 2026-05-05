import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild, isApprover } from "@/lib/auth";
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

  const logs = await prisma.studyLog.findMany({
    where,
    include: { user: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isChild(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { minutes, studiedAt, note } = body;
  if (!minutes || minutes <= 0) {
    return NextResponse.json({ error: "minutes must be a positive integer" }, { status: 400 });
  }

  const log = await prisma.studyLog.create({
    data: {
      userId,
      minutes: Number(minutes),
      studiedAt: studiedAt ? new Date(studiedAt) : new Date(),
      note: note?.trim() || null,
    },
    include: { user: { select: { displayName: true } } },
  });

  await notifyParents({
    title: "勉強時間の申請が届きました",
    body: `${log.user.displayName} が ${minutes}分 の勉強を申請しました`,
    url: "/approvals",
  });

  return NextResponse.json(log, { status: 201 });
}
