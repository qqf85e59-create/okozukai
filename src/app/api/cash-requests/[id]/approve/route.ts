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

  try {
    await prisma.$transaction(async (tx) => {
      // 承認時点で残高を再確認（申請後に残高が変動している可能性）
      const balance = await tx.balance.findUnique({ where: { userId: cashReq.userId } });
      const totalRequired = cashReq.amount + cashReq.fee;
      if (!balance || balance.virtualAmount < totalRequired) {
        throw new Error("残高不足のため承認できません");
      }

      await tx.cashRequest.update({
        where: { id },
        data: { status: "approved", reviewedAt: new Date(), reviewerId },
      });
      // 手数料 + 申請額を残高から引く
      await tx.balance.update({
        where: { userId: cashReq.userId },
        data: {
          virtualAmount: { decrement: totalRequired },
          totalCashed: { increment: cashReq.amount },
        },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "承認に失敗しました";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
