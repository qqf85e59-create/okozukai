import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  const logs = await prisma.settlementLog.findMany({
    where: userId ? { userId } : {},
    orderBy: { settledAt: "desc" },
    take: 50,
  });

  return NextResponse.json(logs);
}
