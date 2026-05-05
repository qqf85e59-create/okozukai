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

  // 承認時点で残高を再確認（申請後に残高が変動している可能性）
  const balance = await prisma.balance.findUnique({ where: { userId: cashReq.userId } });
  const totalRequired = cashReq.amount + cashReq.fee;
  if (!balance || balance.virtualAmount < totalRequired) {
    return NextResponse.json({ error: "残高不足のため承認できません" }, { status: 400 });
  }

  // Note: prisma.$transaction(async callback) does not commit with the
  // better-sqlite3 adapter (v7.8.x), so we use sequential awaits instead.
  await prisma.cashRequest.update({
    where: { id },
    data: { status: "approved", reviewedAt: new Date(), reviewerId },
  });

  await prisma.balance.update({
    where: { userId: cashReq.userId },
    data: {
      virtualAmount: { decrement: totalRequired },
      totalCashed: { increment: cashReq.amount },
    },
  });

  return NextResponse.json({ ok: true });
}
