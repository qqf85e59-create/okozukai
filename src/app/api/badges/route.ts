import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: "desc" },
  });

  return NextResponse.json(userBadges.map((ub) => ({
    id: ub.badge.id,
    label: ub.badge.label,
    icon: ub.badge.icon,
    earnedAt: ub.earnedAt,
  })));
}
