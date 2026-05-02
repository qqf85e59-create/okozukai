import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isApprover } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const comments = await prisma.comment.findMany({
    where: { requestId: id, deletedAt: null },
    include: { author: { select: { id: true, displayName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: "コメント内容は必須です" }, { status: 400 });
  }

  // Check request exists and user has access
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });

  // Only the request owner or parents can comment
  if (request.userId !== userId && !isApprover(role)) {
    return NextResponse.json({ error: "コメント権限がありません" }, { status: 403 });
  }

  const comment = await prisma.comment.create({
    data: {
      requestId: id,
      authorId: userId,
      body: body.trim(),
    },
    include: { author: { select: { id: true, displayName: true, role: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
