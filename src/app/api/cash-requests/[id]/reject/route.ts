import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reviewerId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!reviewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { rejectReason } = await req.json();

  if (!rejectReason?.trim()) {
    return NextResponse.json({ error: "否決理由は必須です" }, { status: 400 });
  }

  await prisma.cashRequest.update({
    where: { id },
    data: { status: "rejected", reviewedAt: new Date(), reviewerId, rejectReason },
  });

  return NextResponse.json({ ok: true });
}
