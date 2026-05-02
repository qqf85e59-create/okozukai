import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { id, password } = await req.json();

  if (!id || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "IDまたはパスワードが違います" }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, role: user.role });

  const res = NextResponse.json({
    user: {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });

  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}
