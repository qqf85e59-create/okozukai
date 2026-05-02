import { prisma } from "./db";

export async function runSettlement(): Promise<{
  processed: number;
  skipped: string[];
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const children = await prisma.user.findMany({
    where: { role: "child" },
    include: { balance: true },
  });

  let processed = 0;
  const skipped: string[] = [];

  for (const child of children) {
    await prisma.$transaction(async (tx) => {
      // 冪等性: 今日すでに集計済みならスキップ (トランザクション内で再確認)
      const existingLog = await tx.settlementLog.findFirst({
        where: {
          userId: child.id,
          settledAt: { gte: today, lt: tomorrow },
        },
      });

      if (existingLog) {
        skipped.push(child.displayName);
        return;
      }

      const balance = child.balance;
      if (!balance) return;

      const totalMin = balance.accumulatedMin + balance.carryoverMin;

      // 60分単位で切り捨て（マイナス側も同様）
      const convertedHours = totalMin >= 0 ? Math.floor(totalMin / 60) : Math.ceil(totalMin / 60);
      const convertedAmount = convertedHours * 500;
      const newCarryover = totalMin - convertedHours * 60;

      // 申請を集計済みに更新
      await tx.request.updateMany({
        where: { userId: child.id, status: "approved" },
        data: { status: "settled", settledAt: new Date() },
      });

      // 残高更新
      await tx.balance.update({
        where: { userId: child.id },
        data: {
          accumulatedMin: 0,
          carryoverMin: newCarryover,
          virtualAmount: { increment: convertedAmount },
        },
      });

      // 集計ログ
      await tx.settlementLog.create({
        data: {
          userId: child.id,
          totalMin,
          convertedAmount,
          carryoverMin: newCarryover,
        },
      });
      
      processed++;
    });
  }

  return { processed, skipped };
}
