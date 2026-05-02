import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateGrade } from "@/lib/grade";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const grade = user.birthDate ? calculateGrade(user.birthDate) : null;

  return NextResponse.json({
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    grade,
  });
}
