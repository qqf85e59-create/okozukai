import { NextRequest, NextResponse } from "next/server";
import { runSettlement } from "@/lib/settlement";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notifyParents, notifyUser } from "@/lib/push";
import { addYenLedger } from "@/lib/ledger";
import crypto from "crypto";

// バッジ定義（condition: "streak_N" | "tasks_N" | "earned_N"）
const BADGE_DEFS = [
  { id: "streak_7",    label: "7日連続！",      icon: "Flame",       condition: "streak_7" },
  { id: "streak_30",   label: "30日連続！",     icon: "Trophy",      condition: "streak_30" },
  { id: "tasks_10",    label: "10回達成",       icon: "Star",        condition: "tasks_10" },
  { id: "tasks_50",    label: "50回達成",       icon: "Award",       condition: "tasks_50" },
  { id: "tasks_100",   label: "100回達成",      icon: "Crown",       condition: "tasks_100" },
  { id: "earned_1000", label: "1000円獲得",     icon: "Coins",       condition: "earned_1000" },
  { id: "earned_5000", label: "5000円獲得",     icon: "Banknote",    condition: "earned_5000" },
  { id: "goal_first",  label: "はじめての目標", icon: "Target",      condition: "goal_first" },
];

async function ensureBadges() {
  for (const b of BADGE_DEFS) {
    await prisma.badge.upsert({
      where: { id: b.id },
      update: { label: b.label, icon: b.icon },
      create: b,
    });
  }
}

async function checkAndAwardBadges() {
  await ensureBadges();
  const children = await prisma.user.findMany({ where: { role: "child", isActive: true } });

  for (const child of children) {
    const approvedReqs = await prisma.request.findMany({
      where: { userId: child.id, status: "approved", minutes: { gt: 0 } },
      orderBy: { requestedAt: "desc" },
    });

    // Calculate streak
    let streak = 0;
    if (approvedReqs.length > 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const daysWithActivity = new Set(approvedReqs.map((r) => {
        const d = new Date(r.requestedAt); d.setHours(0, 0, 0, 0); return d.getTime();
      }));
      for (let i = 0; i < 365; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        if (daysWithActivity.has(d.getTime())) streak++;
        else break;
      }
    }

    const totalTasks = approvedReqs.length;
    const balance = await prisma.balance.findUnique({ where: { userId: child.id } });
    const totalEarned = balance ? balance.virtualAmount + balance.totalCashed : 0;
    const goalCount = await prisma.savingsGoal.count({ where: { userId: child.id } });

    const conditions: Record<string, boolean> = {
      streak_7:    streak >= 7,
      streak_30:   streak >= 30,
      tasks_10:    totalTasks >= 10,
      tasks_50:    totalTasks >= 50,
      tasks_100:   totalTasks >= 100,
      earned_1000: totalEarned >= 1000,
      earned_5000: totalEarned >= 5000,
      goal_first:  goalCount >= 1,
    };

    const existing = await prisma.userBadge.findMany({ where: { userId: child.id }, select: { badgeId: true } });
    const existingIds = new Set(existing.map((b) => b.badgeId));

    for (const badge of BADGE_DEFS) {
      if (conditions[badge.condition] && !existingIds.has(badge.id)) {
        await prisma.userBadge.create({ data: { userId: child.id, badgeId: badge.id } });
        await notifyUser(child.id, {
          title: `バッジ獲得！「${badge.label}」`,
          body: "ホームページで確認しよう",
          url: "/home",
        }).catch(() => {});
      }
    }
  }
}

async function applyScheduledBonuses() {
  const today = new Date();
  const todayDay = today.getDate();
  const bonuses = await prisma.scheduledBonus.findMany({ where: { isActive: true } });

  for (const bonus of bonuses) {
    const shouldApplyToday =
      bonus.type === "monthly" && bonus.dayOfMonth === todayDay ||
      bonus.type === "birthday" && (() => {
        const user = { birthDate: null as Date | null };
        return false; // resolved below
      })();

    if (bonus.type === "monthly" && bonus.dayOfMonth === todayDay) {
      // Check not already applied today
      if (bonus.lastApplied) {
        const last = new Date(bonus.lastApplied);
        if (last.getFullYear() === today.getFullYear() && last.getMonth() === today.getMonth()) continue;
      }
      await prisma.balance.update({
        where: { userId: bonus.userId },
        data: { virtualAmount: { increment: bonus.amountYen } },
      });
      await addYenLedger(bonus.userId, bonus.amountYen, "BONUS", { sourceId: bonus.id, note: bonus.label });
      await prisma.scheduledBonus.update({
        where: { id: bonus.id },
        data: { lastApplied: today },
      });
      await notifyUser(bonus.userId, {
        title: "ボーナスが届いた！",
        body: `「${bonus.label}」で${bonus.amountYen.toLocaleString("ja-JP")}円が追加されました`,
        url: "/home",
      }).catch(() => {});
    }

    if (bonus.type === "birthday") {
      const user = await prisma.user.findUnique({ where: { id: bonus.userId }, select: { birthDate: true } });
      if (!user?.birthDate) continue;
      const bd = new Date(user.birthDate);
      if (bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate()) {
        if (bonus.lastApplied) {
          const last = new Date(bonus.lastApplied);
          if (last.getFullYear() === today.getFullYear()) continue;
        }
        await prisma.balance.update({
          where: { userId: bonus.userId },
          data: { virtualAmount: { increment: bonus.amountYen } },
        });
        await addYenLedger(bonus.userId, bonus.amountYen, "BONUS", { sourceId: bonus.id, note: bonus.label });
        await prisma.scheduledBonus.update({
          where: { id: bonus.id },
          data: { lastApplied: today },
        });
        await notifyUser(bonus.userId, {
          title: "お誕生日ボーナス！",
          body: `「${bonus.label}」で${bonus.amountYen.toLocaleString("ja-JP")}円が届きました🎂`,
          url: "/home",
        }).catch(() => {});
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;
  const role = req.headers.get("x-user-role") ?? "";
  const actorId = req.headers.get("x-user-id") ?? "cron";

  const isCronAuth =
    expectedSecret &&
    cronSecret &&
    cronSecret.length === expectedSecret.length &&
    crypto.timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedSecret));
  const isParentAuth = role === "approver" || role === "admin";

  if (!isCronAuth && !isParentAuth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { task } = await req.json().catch(() => ({ task: "settlement" }));

  if (task === "settlement") {
    const result = await runSettlement();
    await audit(actorId, "settlement.run", "Settlement", "batch", {
      processed: result.processed,
      skipped: result.skipped,
    });
    await notifyParents({
      title: "週次精算が完了しました",
      body: `${result.processed}人分の集計が終わりました`,
      url: "/home",
    }).catch(() => {});
    return NextResponse.json(result);
  }

  if (task === "check-badges") {
    await checkAndAwardBadges();
    return NextResponse.json({ ok: true });
  }

  if (task === "apply-bonuses") {
    await applyScheduledBonuses();
    return NextResponse.json({ ok: true });
  }

  if (task === "daily") {
    await checkAndAwardBadges();
    await applyScheduledBonuses();
    return NextResponse.json({ ok: true, ran: ["check-badges", "apply-bonuses"] });
  }

  if (task === "audit-archive") {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deleted = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return NextResponse.json({ archived: deleted.count });
  }

  if (task === "reconcile") {
    const children = await prisma.user.findMany({ where: { role: "child" } });
    const mismatches: string[] = [];
    for (const u of children) {
      const [tlSum, ylSum, bal] = await Promise.all([
        prisma.timeLedger.aggregate({ where: { userId: u.id }, _sum: { deltaMinutes: true } }),
        prisma.yenLedger.aggregate({ where: { userId: u.id }, _sum: { deltaYen: true } }),
        prisma.balance.findUnique({ where: { userId: u.id } }),
      ]);
      const expectedMin = tlSum._sum.deltaMinutes ?? 0;
      const expectedYen = ylSum._sum.deltaYen ?? 0;
      if (bal && (bal.accumulatedMin !== expectedMin || bal.virtualAmount !== expectedYen)) {
        mismatches.push(u.id);
        await audit(actorId, "reconcile.mismatch", "Balance", u.id, {
          expectedMin, actualMin: bal.accumulatedMin,
          expectedYen, actualYen: bal.virtualAmount,
        });
        await prisma.balance.update({
          where: { userId: u.id },
          data: { accumulatedMin: expectedMin, virtualAmount: expectedYen },
        });
      }
    }
    return NextResponse.json({ ok: true, checked: children.length, mismatches });
  }

  return NextResponse.json({ error: "Unknown task" }, { status: 400 });
}
