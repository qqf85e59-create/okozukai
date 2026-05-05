import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reviewerId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!reviewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "承認権限がありません" }, { status: 403 });

  const { id } = await params;

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: "承認待ち以外の申請は操作できません" }, { status: 400 });
  }

  await prisma.request.update({
    where: { id },
    data: { status: "approved", reviewedAt: new Date(), reviewerId },
  });

  await prisma.balance.update({
    where: { userId: request.userId },
    data: { accumulatedMin: { increment: request.minutes } },
  });

  await prisma.requestUndoToken.upsert({
    where: { requestId: id },
    update: { expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    create: { requestId: id, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });

  await audit(reviewerId, "request.approve", "Request", id, { minutes: request.minutes });

  return NextResponse.json({ ok: true });
}

