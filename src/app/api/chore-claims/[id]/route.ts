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
  const claim = await prisma.choreClaim.findUnique({ where: { id } });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (claim.status !== "PENDING") return NextResponse.json({ error: "PENDING状態の申請のみキャンセルできます" }, { status: 400 });

  await prisma.choreClaim.delete({ where: { id } });
  await audit(userId, "chore-claim.cancel", "ChoreClaim", id, { totalMinutes: claim.totalMinutes });

  return NextResponse.json({ ok: true });
}
