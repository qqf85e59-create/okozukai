import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { calculateGrade } from "@/lib/grade";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    include: { balance: true },
    orderBy: { createdAt: "asc" },
  });

  const result = users.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    role: u.role,
    birthDate: u.birthDate,
    gradeOverride: u.gradeOverride,
    exchangeRate: u.exchangeRate,
    colorToken: u.colorToken,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
    grade: u.gradeOverride
      ? { gradeCode: u.gradeOverride, gradeLabel: u.gradeOverride, gradeGroup: "override" as const }
      : u.birthDate
        ? calculateGrade(u.birthDate)
        : null,
    balance: u.balance,
  }));

  return NextResponse.json(result);
}
