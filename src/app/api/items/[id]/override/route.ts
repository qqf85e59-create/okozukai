import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: itemId } = await params;
  const { userId, overrideMin } = await req.json();

  if (!userId || overrideMin === undefined) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const override = await prisma.itemOverride.upsert({
    where: { itemId_userId: { itemId, userId } },
    create: { itemId, userId, overrideMin },
    update: { overrideMin },
  });

  return NextResponse.json(override);
}
