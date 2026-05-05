import { prisma } from "./db";
import { YenLedgerReason, LedgerReason, LedgerSourceType, ConsumeCategory } from "../generated/prisma/client";
import { MINUTES_PER_UNIT, YEN_PER_UNIT, CASHOUT_FEE } from "./constants";

export type { ConsumeCategory };

export type { YenLedgerReason, LedgerReason, LedgerSourceType };

export async function addYenLedger(
  userId: string,
  deltaYen: number,
  reason: YenLedgerReason,
  opts?: { sourceId?: string; note?: string }
) {
  return prisma.yenLedger.create({
    data: { userId, deltaYen, reason, sourceId: opts?.sourceId ?? null, note: opts?.note ?? null },
  });
}

export async function getYenBalance(userId: string): Promise<number> {
  const result = await prisma.yenLedger.aggregate({
    where: { userId },
    _sum: { deltaYen: true },
  });
  return result._sum.deltaYen ?? 0;
}

export async function addTimeLedger(
  userId: string,
  deltaMinutes: number,
  reason: LedgerReason,
  sourceType: LedgerSourceType,
  opts?: { sourceId?: string; note?: string }
) {
  return prisma.timeLedger.create({
    data: { userId, deltaMinutes, reason, sourceType, sourceId: opts?.sourceId ?? null, note: opts?.note ?? null },
  });
}

export async function getTimeBalance(userId: string): Promise<number> {
  const result = await prisma.timeLedger.aggregate({
    where: { userId },
    _sum: { deltaMinutes: true },
  });
  return result._sum.deltaMinutes ?? 0;
}

export async function convertTimeToYen(
  userId: string,
  minutesUsed: number
): Promise<{ yenGained: number }> {
  if (minutesUsed < MINUTES_PER_UNIT || minutesUsed % MINUTES_PER_UNIT !== 0) {
    throw new Error(`minutesUsed must be a multiple of ${MINUTES_PER_UNIT}`);
  }

  const balance = await prisma.balance.findUnique({ where: { userId } });
  if (!balance || balance.accumulatedMin < minutesUsed) {
    throw new Error("Insufficient time balance");
  }

  const yenGained = (minutesUsed / MINUTES_PER_UNIT) * YEN_PER_UNIT;

  const tc = await prisma.timeConvert.create({
    data: { userId, minutesUsed, yenGained, rateSnapshot: YEN_PER_UNIT },
  });

  await prisma.timeLedger.create({
    data: {
      userId,
      deltaMinutes: -minutesUsed,
      reason: "CONVERT_OUT",
      sourceType: "TIME_CONVERT",
      sourceId: tc.id,
    },
  });

  await prisma.yenLedger.create({
    data: { userId, deltaYen: yenGained, reason: "CONVERT_IN", sourceId: tc.id },
  });

  await prisma.balance.update({
    where: { userId },
    data: {
      accumulatedMin: { decrement: minutesUsed },
      virtualAmount: { increment: yenGained },
    },
  });

  return { yenGained };
}

export async function cashOut(
  userId: string,
  approvedById: string,
  note?: string
): Promise<{ grossYen: number; feeYen: number; netYen: number }> {
  const balance = await prisma.balance.findUnique({ where: { userId } });
  if (!balance || balance.virtualAmount < CASHOUT_FEE) {
    throw new Error("Insufficient balance");
  }

  const grossYen = balance.virtualAmount;
  const feeYen = CASHOUT_FEE;
  const netYen = grossYen - feeYen;

  const co = await prisma.cashOut.create({
    data: { userId, grossYen, feeYen, netYen, approvedById, note: note ?? null },
  });

  await prisma.yenLedger.create({
    data: { userId, deltaYen: -netYen, reason: "CASH_OUT", sourceId: co.id },
  });

  await prisma.yenLedger.create({
    data: { userId, deltaYen: -feeYen, reason: "CASH_FEE", sourceId: co.id },
  });

  await prisma.balance.update({
    where: { userId },
    data: {
      virtualAmount: { decrement: grossYen },
      totalCashed: { increment: netYen },
    },
  });

  return { grossYen, feeYen, netYen };
}

export async function consumeTime(
  userId: string,
  category: ConsumeCategory,
  minutesUsed: number,
  memo?: string
): Promise<string> {
  if (minutesUsed <= 0) throw new Error("minutesUsed must be positive");

  const tc = await prisma.timeConsume.create({
    data: { userId, category, minutesUsed, memo: memo ?? null },
  });

  await prisma.timeLedger.create({
    data: {
      userId,
      deltaMinutes: -minutesUsed,
      reason: "CONSUME",
      sourceType: "TIME_CONSUME",
      sourceId: tc.id,
      note: memo ?? null,
    },
  });

  await prisma.balance.upsert({
    where: { userId },
    update: { accumulatedMin: { decrement: minutesUsed } },
    create: {
      userId,
      accumulatedMin: -minutesUsed,
      carryoverMin: 0,
      virtualAmount: 0,
      totalCashed: 0,
      totalDeducted: 0,
    },
  });

  return tc.id;
}
