import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reviewerId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!reviewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const cashReq = await prisma.cashRequest.findUnique({ where: { id } });
  if (!cashReq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cashReq.status !== "pending") {
    return NextResponse.json({ error: "承認待ち以外の申請は操作できません" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.cashRequest.update({
      where: { id },
      data: { status: "approved", reviewedAt: new Date(), reviewerId },
    });
    // 手数料 + 申請額を残高から引く
    await tx.balance.update({
      where: { userId: cashReq.userId },
      data: {
        virtualAmount: { decrement: cashReq.amount + cashReq.fee },
        totalCashed: { increment: cashReq.amount },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
