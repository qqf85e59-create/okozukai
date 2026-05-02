import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

  // Export all tables as JSON
  const [users, balances, masterItems, itemOverrides, requests, cashRequests, expenseDeductions, settlementLogs, savingsGoals, attachments, comments, auditLogs] = await Promise.all([
    prisma.user.findMany({ select: { id: true, displayName: true, role: true, birthDate: true, mustChangePassword: true, createdAt: true } }),
    prisma.balance.findMany(),
    prisma.masterItem.findMany(),
    prisma.itemOverride.findMany(),
    prisma.request.findMany(),
    prisma.cashRequest.findMany(),
    prisma.expenseDeduction.findMany(),
    prisma.settlementLog.findMany(),
    prisma.savingsGoal.findMany(),
    prisma.attachment.findMany(),
    prisma.comment.findMany(),
    prisma.auditLog.findMany(),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    users,
    balances,
    masterItems,
    itemOverrides,
    requests,
    cashRequests,
    expenseDeductions,
    settlementLogs,
    savingsGoals,
    attachments,
    comments,
    auditLogs,
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="okozukai_backup_${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
