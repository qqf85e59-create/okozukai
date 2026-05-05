import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { notifyUser } from "@/lib/push";
import { audit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const reviewerId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const rejectedReason = body.rejectedReason?.trim();
  if (!rejectedReason) return NextResponse.json({ error: "rejectedReason is required" }, { status: 400 });

  const claim = await prisma.choreClaim.findUnique({
    where: { id },
    include: { choreItem: { select: { name: true } } },
  });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 400 });

  await prisma.choreClaim.update({
    where: { id },
    data: { status: "REJECTED", approvedById: reviewerId, approvedAt: new Date(), rejectedReason },
  });
  await notifyUser(claim.userId, {
    title: "おてつだいの申請が否決されました",
    body: `「${claim.choreItem.name}」の申請が否決されました。理由: ${rejectedReason}`,
    url: "/requests",
  });
  await audit(reviewerId, "chore-claim.reject", "ChoreClaim", id, { rejectedReason, userId: claim.userId });

  return NextResponse.json({ ok: true });
}
