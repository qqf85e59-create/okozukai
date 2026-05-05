import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateGrade } from "@/lib/grade";

export async function GET() {
  const [users, yenAggregates] = await Promise.all([
    prisma.user.findMany({
      include: { balance: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.yenLedger.groupBy({
      by: ["userId"],
      _sum: { deltaYen: true },
    }),
  ]);

  const yenMap = Object.fromEntries(
    yenAggregates.map((a) => [a.userId, a._sum.deltaYen ?? 0])
  );

  const result = users.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    role: u.role,
    grade: u.birthDate ? calculateGrade(u.birthDate) : null,
    balance: u.balance,
    yenBalance: yenMap[u.id] ?? 0,
  }));

  return NextResponse.json(result);
}
