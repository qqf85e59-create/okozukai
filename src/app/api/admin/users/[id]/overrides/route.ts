import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: userId } = await params;

  const [choreItems, penaltyItems, choreOverrides, penaltyOverrides] = await Promise.all([
    prisma.choreItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.penaltyItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.userChoreOverride.findMany({ where: { userId } }),
    prisma.userPenaltyOverride.findMany({ where: { userId } }),
  ]);

  const choreOverrideMap = Object.fromEntries(choreOverrides.map((o) => [o.choreItemId, o]));
  const penaltyOverrideMap = Object.fromEntries(penaltyOverrides.map((o) => [o.penaltyItemId, o]));

  return NextResponse.json({
    choreOverrides: choreItems.map((item) => {
      const ov = choreOverrideMap[item.id];
      return {
        choreItemId: item.id,
        category: item.category,
        name: item.name,
        defaultMinutes: item.bonusMinutes,
        overrideMinutes: ov?.bonusMinutes ?? null,
        active: ov?.active ?? true,
      };
    }),
    penaltyOverrides: penaltyItems.map((item) => {
      const ov = penaltyOverrideMap[item.id];
      return {
        penaltyItemId: item.id,
        name: item.name,
        defaultMinutes: item.penaltyMinutes,
        overrideMinutes: ov?.penaltyMinutes ?? null,
        active: ov?.active ?? true,
      };
    }),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: userId } = await params;
  const body = await req.json();
  const { choreOverrides, penaltyOverrides } = body as {
    choreOverrides: { choreItemId: string; overrideMinutes: number | null; active: boolean }[];
    penaltyOverrides: { penaltyItemId: string; overrideMinutes: number | null; active: boolean }[];
  };

  for (const ov of choreOverrides ?? []) {
    await prisma.userChoreOverride.upsert({
      where: { userId_choreItemId: { userId, choreItemId: ov.choreItemId } },
      update: { bonusMinutes: ov.overrideMinutes, active: ov.active },
      create: { userId, choreItemId: ov.choreItemId, bonusMinutes: ov.overrideMinutes, active: ov.active },
    });
  }

  for (const ov of penaltyOverrides ?? []) {
    await prisma.userPenaltyOverride.upsert({
      where: { userId_penaltyItemId: { userId, penaltyItemId: ov.penaltyItemId } },
      update: { penaltyMinutes: ov.overrideMinutes, active: ov.active },
      create: { userId, penaltyItemId: ov.penaltyItemId, penaltyMinutes: ov.overrideMinutes, active: ov.active },
    });
  }

  return NextResponse.json({ ok: true });
}
