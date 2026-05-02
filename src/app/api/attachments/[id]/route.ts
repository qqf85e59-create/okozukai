import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { request: { select: { userId: true } } },
  });

  if (!attachment) {
    return NextResponse.json({ error: "添付ファイルが見つかりません" }, { status: 404 });
  }

  // Only creator or admin can delete
  if (attachment.request.userId !== userId && !isAdmin(role)) {
    return NextResponse.json({ error: "削除権限がありません" }, { status: 403 });
  }

  await storage.remove(attachment.url);
  await prisma.attachment.delete({ where: { id } });
  await audit(userId, "attachment.delete", "Attachment", id);

  return NextResponse.json({ ok: true });
}
