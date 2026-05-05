import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamilyMember } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const events = await prisma.event.findMany({
    where: {
      familyId: member.familyId,
      ...(from && !isNaN(Date.parse(from)) && { startAt: { gte: new Date(from) } }),
      ...(to && !isNaN(Date.parse(to)) && { startAt: { lte: new Date(to) } }),
    },
    include: {
      participants: {
        include: {
          // colorToken（既存 User）と colorTag（VirtualMember）を含める
          user: { select: { id: true, displayName: true, colorToken: true } },
          virtualMember: { select: { id: true, displayName: true, colorTag: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
  });

  // 日別グルーピング（startAt の YYYY-MM-DD をキーにする）
  const grouped: Record<string, typeof events> = {};
  for (const event of events) {
    // UTC 日付文字列をキーとして使用
    const dateKey = event.startAt.toISOString().split("T")[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  }

  return NextResponse.json(grouped);
}
