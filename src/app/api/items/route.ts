import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.masterItem.findMany({
    where: { isActive: true },
    include: {
      overrides: true,
      _count: {
        select: {
          requests: {
            where: { requestedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // ユーザー向けにオーバーライドを適用した分数を付与
  const result = items.map((item) => {
    const override = item.overrides.find((o) => o.userId === userId);
    return {
      ...item,
      effectiveMin: override ? override.overrideMin : item.defaultMin,
      recentRequestsCount: item._count.requests,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { category, name, description, defaultMin } = await req.json();
  if (!category) {
    return NextResponse.json({ error: "タスク登録: カテゴリを選択してください" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "タスク登録: タスク名を入力してください" }, { status: 400 });
  }
  if (defaultMin === undefined || defaultMin === null) {
    return NextResponse.json({ error: "タスク登録: 分数を入力してください" }, { status: 400 });
  }

  const item = await prisma.masterItem.create({
    data: { category, name, description, defaultMin },
  });

  return NextResponse.json(item, { status: 201 });
}
