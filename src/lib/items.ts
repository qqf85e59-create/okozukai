import { prisma } from "./db";

export async function resolveBonusMinutes(userId: string, choreItemId: string): Promise<number | null> {
  const override = await prisma.userChoreOverride.findUnique({
    where: { userId_choreItemId: { userId, choreItemId } },
  });
  if (override && !override.active) return null;
  if (override?.bonusMinutes != null) return override.bonusMinutes;

  const item = await prisma.choreItem.findUnique({ where: { id: choreItemId } });
  if (!item || !item.active) return null;
  return item.bonusMinutes;
}

// Returns positive value; caller negates for display/computation
export async function resolvePenaltyMinutes(userId: string, penaltyItemId: string): Promise<number | null> {
  const override = await prisma.userPenaltyOverride.findUnique({
    where: { userId_penaltyItemId: { userId, penaltyItemId } },
  });
  if (override && !override.active) return null;
  if (override?.penaltyMinutes != null) return override.penaltyMinutes;

  const item = await prisma.penaltyItem.findUnique({ where: { id: penaltyItemId } });
  if (!item || !item.active) return null;
  return item.penaltyMinutes;
}
