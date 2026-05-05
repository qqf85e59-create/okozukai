import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, penaltyMinutes, mode, unitLabel, active, sortOrder } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (penaltyMinutes !== undefined) data.penaltyMinutes = Number(penaltyMinutes);
  if (mode !== undefined) data.mode = mode;
  if (unitLabel !== undefined) data.unitLabel = unitLabel;
  if (active !== undefined) data.active = active;
  if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);

  const item = await prisma.penaltyItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const item = await prisma.penaltyItem.update({ where: { id }, data: { active: false } });
  return NextResponse.json(item);
}
