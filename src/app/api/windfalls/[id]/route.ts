import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actorId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const record = await prisma.windfallIncome.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.windfallIncome.delete({ where: { id } });
    await tx.balance.update({
      where: { userId: record.userId },
      data: { virtualAmount: { decrement: record.amount } },
    });
  });

  return NextResponse.json({ ok: true });
}
