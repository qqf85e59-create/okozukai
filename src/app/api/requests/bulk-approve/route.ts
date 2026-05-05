import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const reviewerId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!reviewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "承認権限がありません" }, { status: 403 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids は必須です" }, { status: 400 });
  }
  if (ids.length > 50) {
    return NextResponse.json({ error: "一度に50件まで" }, { status: 400 });
  }

  const results: { approved: string[]; skipped: string[] } = { approved: [], skipped: [] };

  for (const id of ids) {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request || request.status !== "pending") {
      results.skipped.push(id);
      continue;
    }

    await prisma.request.update({
      where: { id },
      data: { status: "approved", reviewedAt: new Date(), reviewerId },
    });

    await prisma.balance.update({
      where: { userId: request.userId },
      data: { accumulatedMin: { increment: request.minutes } },
    });

    await prisma.requestUndoToken.upsert({
      where: { requestId: id },
      update: { expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      create: { requestId: id, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    await audit(reviewerId, "request.approve", "Request", id);
    results.approved.push(id);
  }

  return NextResponse.json(results);
}
