import { prisma } from "./db";
import { addYenLedger } from "./ledger";

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
    // 冪等性: 今日すでに集計済みならスキップ
    const existingLog = await prisma.settlementLog.findFirst({
      where: {
        userId: child.id,
        settledAt: { gte: today, lt: tomorrow },
      },
    });

    if (existingLog) {
      skipped.push(child.displayName);
      continue;
    }

    const balance = child.balance;
    if (!balance) continue;

    const totalMin = balance.accumulatedMin + balance.carryoverMin;

    // Note: prisma.$transaction(async callback) does not commit with the
    // better-sqlite3 adapter (v7.8.x), so we use sequential awaits instead.

    // 換算レートが設定されている場合は分単位で計算、なければ 500円/60分
    let convertedAmount: number;
    let newCarryover: number;
    const rate = (child as Record<string, unknown>).exchangeRate as number | null | undefined;
    if (rate != null && rate > 0) {
      convertedAmount = totalMin >= 0 ? Math.floor(totalMin * rate) : Math.ceil(totalMin * rate);
      newCarryover = 0;
    } else {
      const convertedHours = totalMin >= 0 ? Math.floor(totalMin / 60) : Math.ceil(totalMin / 60);
      convertedAmount = convertedHours * 500;
      newCarryover = totalMin - convertedHours * 60;
    }
    const convertedHours = totalMin >= 0 ? Math.floor(totalMin / 60) : Math.ceil(totalMin / 60);

    // 申請を集計済みに更新
    await prisma.request.updateMany({
      where: { userId: child.id, status: "approved" },
      data: { status: "settled", settledAt: new Date() },
    });

    // 残高更新
    await prisma.balance.update({
      where: { userId: child.id },
      data: {
        accumulatedMin: 0,
        carryoverMin: newCarryover,
        virtualAmount: { increment: convertedAmount },
      },
    });

    // 集計ログ
    await prisma.settlementLog.create({
      data: {
        userId: child.id,
        totalMin,
        convertedAmount,
        carryoverMin: newCarryover,
      },
    });

    // YenLedger記録
    await addYenLedger(child.id, convertedAmount, "CONVERT_IN", {
      note: `${totalMin}分→${convertedHours}時間`,
    });

    processed++;
  }

  return { processed, skipped };
}
