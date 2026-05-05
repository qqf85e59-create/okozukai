import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actorId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const claim = await prisma.choreClaim.findUnique({ where: { id } });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.status !== "APPROVED") return NextResponse.json({ error: "APPROVED状態のみ取り消せます" }, { status: 400 });

  const approvedAt = claim.approvedAt;
  if (!approvedAt || Date.now() - approvedAt.getTime() > 10 * 60 * 1000) {
    return NextResponse.json({ error: "承認から10分以内のみ取り消せます" }, { status: 400 });
  }

  await prisma.choreClaim.update({
    where: { id },
    data: { status: "PENDING", approvedById: null, approvedAt: null },
  });
  await prisma.timeLedger.create({
    data: {
      userId: claim.userId,
      deltaMinutes: -claim.totalMinutes,
      reason: "ADJUSTMENT",
      sourceType: "CHORE_CLAIM",
      sourceId: id,
      note: "承認取り消し",
    },
  });
  await prisma.balance.update({
    where: { userId: claim.userId },
    data: { accumulatedMin: { decrement: claim.totalMinutes } },
  });
  await audit(actorId, "chore-claim.undo-approve", "ChoreClaim", id, {
    totalMinutes: claim.totalMinutes,
    userId: claim.userId,
  });

  return NextResponse.json({ ok: true });
}
