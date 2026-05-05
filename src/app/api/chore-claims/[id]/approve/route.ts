import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { addTimeLedger } from "@/lib/ledger";
import { notifyUser } from "@/lib/push";
import { audit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const reviewerId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const claim = await prisma.choreClaim.findUnique({
    where: { id },
    include: { choreItem: { select: { name: true } } },
  });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 400 });

  try {
    await prisma.choreClaim.update({
      where: { id },
      data: { status: "APPROVED", approvedById: reviewerId, approvedAt: new Date() },
    });
    await addTimeLedger(claim.userId, claim.totalMinutes, "CHORE", "CHORE_CLAIM", { sourceId: id });
    await prisma.balance.update({
      where: { userId: claim.userId },
      data: { accumulatedMin: { increment: claim.totalMinutes } },
    });
    await notifyUser(claim.userId, {
      title: "おてつだいが承認されました",
      body: `「${claim.choreItem.name}」×${claim.count} (${claim.totalMinutes}分) が承認されました！`,
      url: "/requests",
    });
    await audit(reviewerId, "chore-claim.approve", "ChoreClaim", id, {
      totalMinutes: claim.totalMinutes,
      userId: claim.userId,
    });
  } catch (err) {
    await audit(reviewerId, "chore-claim.approve.partial_failure", "ChoreClaim", id, {
      error: String(err),
      totalMinutes: claim.totalMinutes,
      userId: claim.userId,
    });
    return NextResponse.json({ error: "Partial failure during approval" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
