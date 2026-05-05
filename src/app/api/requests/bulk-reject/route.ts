import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const reviewerId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!reviewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "否決権限がありません" }, { status: 403 });

  const { ids, rejectReason } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids は必須です" }, { status: 400 });
  }
  if (!rejectReason?.trim()) {
    return NextResponse.json({ error: "否決理由は必須です" }, { status: 400 });
  }
  if (ids.length > 50) {
    return NextResponse.json({ error: "一度に50件まで" }, { status: 400 });
  }

  const results: { rejected: string[]; skipped: string[] } = { rejected: [], skipped: [] };

  for (const id of ids) {
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request || request.status !== "pending") {
      results.skipped.push(id);
      continue;
    }

    await prisma.request.update({
      where: { id },
      data: { status: "rejected", reviewedAt: new Date(), reviewerId, rejectReason: rejectReason.trim() },
    });

    await prisma.requestUndoToken.upsert({
      where: { requestId: id },
      update: { expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      create: { requestId: id, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    await audit(reviewerId, "request.reject", "Request", id, { rejectReason: rejectReason.trim() });
    results.rejected.push(id);
  }

  return NextResponse.json(results);
}
