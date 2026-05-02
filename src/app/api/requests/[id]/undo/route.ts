import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actorId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });

  // Check undo token
  const token = await prisma.requestUndoToken.findUnique({ where: { requestId: id } });
  if (!token) {
    return NextResponse.json({ error: "取消トークンが見つかりません" }, { status: 400 });
  }
  if (new Date() > token.expiresAt) {
    return NextResponse.json({ error: "取消期限（10分）を過ぎています" }, { status: 400 });
  }

  const previousStatus = request.status;
  if (previousStatus !== "approved" && previousStatus !== "rejected") {
    return NextResponse.json({ error: "承認/否決済みの申請のみ取消可能です" }, { status: 400 });
  }

  // Check if it's already settled
  if (previousStatus === "approved" && request.settledAt !== null) {
    return NextResponse.json({ error: "すでに集計済みの申請は取消できません" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // Revert status to pending
    const updated = await tx.request.updateMany({
      where: {
        id,
        ...(previousStatus === "approved" ? { status: "approved", settledAt: null } : { status: "rejected" }),
      },
      data: {
        status: "pending",
        reviewedAt: null,
        reviewerId: null,
        rejectReason: null,
      },
    });

    if (updated.count === 0) {
      throw new Error("更新対象がありません（すでに集計済みか、状態が変更されています）");
    }

    // If was approved, reverse the balance change
    if (previousStatus === "approved") {
      await tx.balance.update({
        where: { userId: request.userId },
        data: { accumulatedMin: { decrement: request.minutes } },
      });
    }

    // Delete the undo token
    await tx.requestUndoToken.delete({ where: { requestId: id } });
  });

  await audit(actorId, "request.undo", "Request", id, {
    previousStatus,
    minutesReversed: previousStatus === "approved" ? request.minutes : 0,
  });

  return NextResponse.json({ ok: true, previousStatus });
}
