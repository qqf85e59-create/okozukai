import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/auth";
import { convertTimeToYen } from "@/lib/ledger";
import { MINUTES_PER_UNIT } from "@/lib/constants";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");

  const whereUserId = isChild(role) ? userId : (targetUserId ?? userId);

  const converts = await prisma.timeConvert.findMany({
    where: { userId: whereUserId },
    orderBy: { convertedAt: "desc" },
  });
  return NextResponse.json(converts);
}

export async function POST(req: NextRequest) {
  const requesterId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!requesterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isParent = role === "approver" || role === "admin";
  if (!isChild(role) && !isParent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // Parent can specify a child's userId; child uses their own
  const userId = (isParent && body.userId) ? body.userId : requesterId;
  const minutesUsed = Number(body.minutesUsed);

  const absMin = Math.abs(minutesUsed);
  if (!minutesUsed || absMin < MINUTES_PER_UNIT || absMin % MINUTES_PER_UNIT !== 0) {
    return NextResponse.json(
      { error: `${MINUTES_PER_UNIT}分単位で入力してください` },
      { status: 400 }
    );
  }

  // Children cannot initiate negative conversions (debt settlement is parent-only)
  if (isChild(role) && minutesUsed < 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { yenGained } = await convertTimeToYen(userId, minutesUsed);
    await audit(requesterId, "time-convert.create", "TimeConvert", userId, { minutesUsed, yenGained });
    return NextResponse.json({ ok: true, minutesUsed, yenGained }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "換算に失敗しました";
    const status = message.includes("Insufficient") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
