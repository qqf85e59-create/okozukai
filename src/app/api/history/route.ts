import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const filterUserId = url.searchParams.get("userId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const targetUserId = isChild(role) ? userId : filterUserId;

  const dateFilter =
    from || to
      ? {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        }
      : undefined;

  const [requests, cashRequests, deductions, settlements, windfalls, spending] = await Promise.all([
    prisma.request.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(dateFilter ? { requestedAt: dateFilter } : {}),
      },
      include: {
        user: { select: { id: true, displayName: true } },
        item: { select: { id: true, name: true, category: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 100,
    }),
    prisma.cashRequest.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(dateFilter ? { requestedAt: dateFilter } : {}),
      },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { requestedAt: "desc" },
      take: 50,
    }),
    prisma.expenseDeduction.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.settlementLog.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(dateFilter ? { settledAt: dateFilter } : {}),
      },
      orderBy: { settledAt: "desc" },
      take: 50,
    }),
    prisma.windfallIncome.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(dateFilter ? { recordedAt: dateFilter } : {}),
      },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { recordedAt: "desc" },
      take: 50,
    }),
    prisma.spendingRecord.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(dateFilter ? { recordedAt: dateFilter } : {}),
      },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { recordedAt: "desc" },
      take: 50,
    }),
  ]);

  const events = [
    ...requests.map((r) => ({ type: "request", date: r.requestedAt, data: r })),
    ...cashRequests.map((r) => ({ type: "cash", date: r.requestedAt, data: r })),
    ...deductions.map((d) => ({ type: "deduction", date: d.createdAt, data: d })),
    ...settlements.map((s) => ({ type: "settlement", date: s.settledAt, data: s })),
    ...windfalls.map((w) => ({ type: "windfall", date: w.recordedAt, data: w })),
    ...spending.map((s) => ({ type: "spending", date: s.recordedAt, data: s })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(events);
}
