import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const goal = await prisma.savingsGoal.findUnique({ where: { id } });
  if (!goal || goal.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.targetAmount !== undefined && { targetAmount: Number(body.targetAmount) }),
      ...(body.memo !== undefined && { memo: body.memo }),
      ...(body.isAchieved !== undefined && { isAchieved: body.isAchieved }),
      ...(body.targetDate !== undefined && {
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
      }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const goal = await prisma.savingsGoal.findUnique({ where: { id } });
  if (!goal || goal.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.savingsGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
