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
  const log = await prisma.studyLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (log.status !== "APPROVED") return NextResponse.json({ error: "APPROVED状態のみ取り消せます" }, { status: 400 });

  const approvedAt = log.approvedAt;
  if (!approvedAt || Date.now() - approvedAt.getTime() > 10 * 60 * 1000) {
    return NextResponse.json({ error: "承認から10分以内のみ取り消せます" }, { status: 400 });
  }

  await prisma.studyLog.update({
    where: { id },
    data: { status: "PENDING", approvedById: null, approvedAt: null },
  });
  await prisma.timeLedger.create({
    data: {
      userId: log.userId,
      deltaMinutes: -log.minutes,
      reason: "ADJUSTMENT",
      sourceType: "STUDY_LOG",
      sourceId: id,
      note: "承認取り消し",
    },
  });
  await prisma.balance.update({
    where: { userId: log.userId },
    data: { accumulatedMin: { decrement: log.minutes } },
  });
  await audit(actorId, "study-log.undo-approve", "StudyLog", id, { minutes: log.minutes, userId: log.userId });

  return NextResponse.json({ ok: true });
}
