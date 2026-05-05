import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [items, overrides] = await Promise.all([
    prisma.penaltyItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.userPenaltyOverride.findMany({ where: { userId } }),
  ]);

  const overrideMap = Object.fromEntries(overrides.map((o) => [o.penaltyItemId, o]));

  const result = items.map((item) => {
    const ov = overrideMap[item.id];
    if (ov && !ov.active) return null;
    const rawMin = ov?.penaltyMinutes ?? item.penaltyMinutes;
    return {
      id: item.id,
      name: item.name,
      effectiveMin: -rawMin, // 負の値で返す
      mode: item.mode,
      unitLabel: item.unitLabel,
    };
  }).filter(Boolean);

  return NextResponse.json(result);
}
