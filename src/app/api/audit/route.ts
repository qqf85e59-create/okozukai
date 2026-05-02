import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "管理者のみ閲覧可能です" }, { status: 403 });

  const url = new URL(req.url);
  const actor = url.searchParams.get("actor");
  const action = url.searchParams.get("action");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (actor) where.actorId = actor;
  if (action) where.action = { contains: action };
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { actor: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(logs);
}
