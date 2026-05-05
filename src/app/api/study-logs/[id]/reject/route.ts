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

  const log = await prisma.studyLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (log.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 400 });

  await prisma.studyLog.update({
    where: { id },
    data: { status: "REJECTED", approvedById: reviewerId, approvedAt: new Date(), rejectedReason },
  });
  await notifyUser(log.userId, {
    title: "勉強時間の申請が否決されました",
    body: `理由: ${rejectedReason}`,
    url: "/requests",
  });
  await audit(reviewerId, "study-log.reject", "StudyLog", id, { rejectedReason, userId: log.userId });

  return NextResponse.json({ ok: true });
}
