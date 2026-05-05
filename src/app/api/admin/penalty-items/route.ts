import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.penaltyItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, penaltyMinutes, mode, unitLabel, familyId } = body;
  if (!name || penaltyMinutes == null) {
    return NextResponse.json({ error: "name, penaltyMinutes are required" }, { status: 400 });
  }
  if (mode === "PROPORTIONAL" && !unitLabel) {
    return NextResponse.json({ error: "unitLabel required for PROPORTIONAL mode" }, { status: 400 });
  }

  const fid = familyId ?? "default_family_001";
  const agg = await prisma.penaltyItem.aggregate({
    where: { familyId: fid },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const item = await prisma.penaltyItem.create({
    data: {
      familyId: fid,
      name,
      penaltyMinutes: Number(penaltyMinutes),
      mode: mode ?? "FIXED",
      unitLabel: unitLabel ?? null,
      sortOrder,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
