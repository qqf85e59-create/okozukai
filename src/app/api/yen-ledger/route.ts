import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") ?? "";
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = isChild(role) ? userId : (url.searchParams.get("userId") ?? userId);

  const entries = await prisma.yenLedger.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(entries);
}
