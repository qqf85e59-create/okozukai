import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const bonus = await prisma.scheduledBonus.update({
    where: { id },
    data: {
      label: body.label,
      amountYen: body.amountYen !== undefined ? Number(body.amountYen) : undefined,
      dayOfMonth: body.dayOfMonth !== undefined ? (body.dayOfMonth ? Number(body.dayOfMonth) : null) : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    },
  });
  return NextResponse.json(bonus);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.scheduledBonus.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
