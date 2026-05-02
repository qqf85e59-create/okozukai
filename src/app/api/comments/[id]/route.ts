import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(role)) return NextResponse.json({ error: "管理者のみ削除可能です" }, { status: 403 });

  const { id } = await params;

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });

  // Soft delete
  await prisma.comment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit(userId, "comment.delete", "Comment", id);

  return NextResponse.json({ ok: true });
}
