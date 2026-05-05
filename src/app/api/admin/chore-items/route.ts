import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.choreItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { category, name, bonusMinutes, mode, familyId } = body;
  if (!category || !name || bonusMinutes == null) {
    return NextResponse.json({ error: "category, name, bonusMinutes are required" }, { status: 400 });
  }

  const fid = familyId ?? "default_family_001";
  const agg = await prisma.choreItem.aggregate({
    where: { familyId: fid },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const item = await prisma.choreItem.create({
    data: {
      familyId: fid,
      category,
      name,
      bonusMinutes: Number(bonusMinutes),
      mode: mode ?? "FIXED",
      sortOrder,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
