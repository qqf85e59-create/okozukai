import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const attachments = await prisma.attachment.findMany({
    where: { requestId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(attachments);
}
