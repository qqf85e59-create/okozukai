import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const filterUserId = url.searchParams.get("userId");

  const requests = await prisma.request.findMany({
    where: filterUserId ? { userId: filterUserId } : {},
    include: {
      user: { select: { displayName: true } },
      item: { select: { name: true, category: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  const rows = [
    ["日時", "子供", "種別", "項目", "分数", "ステータス", "メモ"].join(","),
    ...requests.map((r) =>
      [
        new Date(r.requestedAt).toLocaleString("ja-JP"),
        r.user.displayName,
        r.item.category,
        `"${r.item.name}"`,
        r.minutes,
        r.status,
        `"${r.note ?? ""}"`,
      ].join(",")
    ),
  ].join("\n");

  const bom = "﻿";
  return new NextResponse(bom + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="okozukai-${Date.now()}.csv"`,
    },
  });
}
