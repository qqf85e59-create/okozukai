import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild, isApprover } from "@/lib/auth";
import { cashOut } from "@/lib/ledger";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  const whereUserId = isChild(role) ? userId : (targetUserId ?? userId);

  const cashOuts = await prisma.cashOut.findMany({
    where: { userId: whereUserId },
    orderBy: { cashedOutAt: "desc" },
  });
  return NextResponse.json(cashOuts);
}

export async function POST(req: NextRequest) {
  const requesterId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!requesterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isChild(role) && !isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  // 親が代理で換金する場合は body.userId を使う
  const userId = (isApprover(role) && body.userId) ? body.userId : requesterId;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const approver = await prisma.user.findFirst({
    where: { familyId: user.familyId, role: { in: ["approver", "admin"] } },
  });
  const approvedById = isApprover(role) ? requesterId : (approver?.id ?? requesterId);

  try {
    const { grossYen, feeYen, netYen } = await cashOut(userId, approvedById, body.note);
    await audit(userId, "cashout.create", "CashOut", userId, { grossYen, feeYen, netYen });
    return NextResponse.json({ ok: true, grossYen, feeYen, netYen }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "換金に失敗しました";
    const status = message.includes("Insufficient") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
