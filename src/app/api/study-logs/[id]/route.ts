import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isChild(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const log = await prisma.studyLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (log.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (log.status !== "PENDING") return NextResponse.json({ error: "PENDING状態の申請のみキャンセルできます" }, { status: 400 });

  await prisma.studyLog.delete({ where: { id } });
  await audit(userId, "study-log.cancel", "StudyLog", id, { minutes: log.minutes });

  return NextResponse.json({ ok: true });
}
