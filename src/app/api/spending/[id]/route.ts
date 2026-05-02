import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const record = await prisma.spendingRecord.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    await tx.spendingRecord.delete({ where: { id } });
    await tx.balance.update({
      where: { userId: record.userId },
      data: { virtualAmount: { increment: record.amount } },
    });
  });

  return NextResponse.json({ ok: true });
}
