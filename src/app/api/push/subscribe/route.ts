import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint, p256dh, auth, userAgent } = await req.json();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }

  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, userAgent: userAgent ?? null, lastUsedAt: new Date() },
    create: { userId, endpoint, p256dh, auth, userAgent: userAgent ?? null },
  });

  return NextResponse.json(sub, { status: 201 });
}
