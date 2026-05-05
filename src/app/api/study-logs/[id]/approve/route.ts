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
  const log = await prisma.studyLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (log.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 400 });

  try {
    await prisma.studyLog.update({
      where: { id },
      data: { status: "APPROVED", approvedById: reviewerId, approvedAt: new Date() },
    });
    await addTimeLedger(log.userId, log.minutes, "STUDY", "STUDY_LOG", { sourceId: id });
    await prisma.balance.update({
      where: { userId: log.userId },
      data: { accumulatedMin: { increment: log.minutes } },
    });
    await notifyUser(log.userId, {
      title: "勉強時間が承認されました",
      body: `${log.minutes}分の勉強が承認されました！`,
      url: "/requests",
    });
    await audit(reviewerId, "study-log.approve", "StudyLog", id, { minutes: log.minutes, userId: log.userId });
  } catch (err) {
    await audit(reviewerId, "study-log.approve.partial_failure", "StudyLog", id, {
      error: String(err),
      minutes: log.minutes,
      userId: log.userId,
    });
    return NextResponse.json({ error: "Partial failure during approval" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
