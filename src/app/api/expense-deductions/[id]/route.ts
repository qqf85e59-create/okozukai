import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const deduction = await prisma.expenseDeduction.findUnique({ where: { id } });
  if (!deduction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.expenseDeduction.delete({ where: { id } });
    await tx.balance.update({
      where: { userId: deduction.userId },
      data: {
        virtualAmount: { increment: deduction.amount },
        totalDeducted: { decrement: deduction.amount },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
