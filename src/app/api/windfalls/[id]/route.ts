import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { addYenLedger } from "@/lib/ledger";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actorId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const record = await prisma.windfallIncome.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Note: prisma.$transaction(async callback) does not commit with the
  // better-sqlite3 adapter (v7.8.x), so we use sequential awaits instead.
  await prisma.windfallIncome.delete({ where: { id } });
  await prisma.balance.update({
    where: { userId: record.userId },
    data: { virtualAmount: { decrement: record.amount } },
  });
  await addYenLedger(record.userId, -record.amount, "ADJUSTMENT", { sourceId: id, note: "windfall削除" });
  await audit(actorId, "windfall.delete", "WindfallIncome", id, { userId: record.userId, amount: record.amount });

  return NextResponse.json({ ok: true });
}
