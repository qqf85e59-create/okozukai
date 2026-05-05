import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { addYenLedger } from "@/lib/ledger";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const deduction = await prisma.expenseDeduction.findUnique({ where: { id } });
  if (!deduction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Note: prisma.$transaction(async callback) does not commit with the
  // better-sqlite3 adapter (v7.8.x), so we use sequential awaits instead.
  const actorId = req.headers.get("x-user-id") ?? "";
  await prisma.expenseDeduction.delete({ where: { id } });
  await prisma.balance.update({
    where: { userId: deduction.userId },
    data: {
      virtualAmount: { increment: deduction.amount },
      totalDeducted: { decrement: deduction.amount },
    },
  });
  await addYenLedger(deduction.userId, deduction.amount, "ADJUSTMENT", { sourceId: id, note: "実費控除取消" });
  await audit(actorId, "expense-deduction.delete", "ExpenseDeduction", id, { userId: deduction.userId, amount: deduction.amount });

  return NextResponse.json({ ok: true });
}
