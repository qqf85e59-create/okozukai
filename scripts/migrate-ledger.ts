#!/usr/bin/env tsx
/**
 * 既存 Balance.virtualAmount を YenLedger.ADJUSTMENT として移行するスクリプト。
 *
 * Usage:
 *   npx tsx scripts/migrate-ledger.ts --dry-run   # プレビューのみ（変更なし）
 *   npx tsx scripts/migrate-ledger.ts             # 実際に移行
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const DRY_RUN = process.argv.includes("--dry-run");

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createClient();

  console.log(`[migrate-ledger] ${DRY_RUN ? "DRY RUN — 変更は行いません" : "本番実行"}`);
  console.log("");

  const balances = await prisma.balance.findMany({
    where: { virtualAmount: { gt: 0 } },
    include: { user: { select: { id: true, displayName: true } } },
  });

  if (balances.length === 0) {
    console.log("移行対象のBalance.virtualAmountがありません。");
    await prisma.$disconnect();
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;

  for (const b of balances) {
    const existing = await prisma.yenLedger.findFirst({
      where: { userId: b.userId, note: "移行: 既存virtualAmount" },
    });

    if (existing) {
      console.log(`SKIP  ${b.user.displayName} (${b.userId}): 移行済み (既存entry: ${existing.id})`);
      skippedCount++;
      continue;
    }

    console.log(`${DRY_RUN ? "[DRY] " : ""}WRITE ${b.user.displayName} (${b.userId}): +${b.virtualAmount}円 → YenLedger ADJUSTMENT`);

    if (!DRY_RUN) {
      await prisma.yenLedger.create({
        data: {
          userId: b.userId,
          deltaYen: b.virtualAmount,
          reason: "ADJUSTMENT",
          note: "移行: 既存virtualAmount",
        },
      });
    }
    migratedCount++;
  }

  console.log("");
  console.log(`完了: ${DRY_RUN ? "移行予定" : "移行済み"} ${migratedCount}件 / スキップ ${skippedCount}件`);

  if (DRY_RUN && migratedCount > 0) {
    console.log("実際に移行するには --dry-run なしで実行してください。");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
