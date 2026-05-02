import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateGrade } from "@/lib/grade";

export async function GET(req: NextRequest) {
  const users = await prisma.user.findMany({
    include: { balance: true },
    orderBy: { createdAt: "asc" },
  });

  const result = users.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    role: u.role,
    grade: u.birthDate ? calculateGrade(u.birthDate) : null,
    balance: u.balance,
  }));

  return NextResponse.json(result);
}
