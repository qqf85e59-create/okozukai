import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [items, overrides] = await Promise.all([
    prisma.choreItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.userChoreOverride.findMany({ where: { userId } }),
  ]);

  const overrideMap = Object.fromEntries(overrides.map((o) => [o.choreItemId, o]));

  const result = items.map((item) => {
    const ov = overrideMap[item.id];
    if (ov && !ov.active) return null;
    const effectiveMin = ov?.bonusMinutes ?? item.bonusMinutes;
    return {
      id: item.id,
      category: item.category,
      name: item.name,
      effectiveMin,
      mode: item.mode,
    };
  }).filter(Boolean);

  return NextResponse.json(result);
}
