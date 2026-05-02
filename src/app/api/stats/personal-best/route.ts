import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || userId;

  // Calculate average weekly earnings over the last 4 weeks (or all time)
  const fourWeeksAgo = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000);
  
  const recentLogs = await prisma.settlementLog.findMany({
    where: { 
      userId: targetUserId,
      settledAt: { gte: fourWeeksAgo }
    },
    orderBy: { settledAt: "desc" }
  });

  let averageYenPerWeek = 500; // Default fallback
  
  if (recentLogs.length > 0) {
    const totalYen = recentLogs.reduce((sum, log) => sum + log.convertedAmount, 0);
    // Rough estimate of weeks elapsed
    const weeks = Math.max(1, recentLogs.length);
    averageYenPerWeek = totalYen / weeks;
  }

  return NextResponse.json({ averageYenPerWeek });
}
