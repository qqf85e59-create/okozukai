import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireFamilyMember, assertEventInFamily } from "@/lib/auth";

const MAX_BODY_LENGTH = 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const scopeErr = await assertEventInFamily(id, member.familyId);
  if (scopeErr) return scopeErr;

  const comments = await prisma.eventComment.findMany({
    where: { eventId: id },
    include: { author: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const scopeErr = await assertEventInFamily(id, member.familyId);
  if (scopeErr) return scopeErr;

  const { body } = await req.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: "コメント内容は必須です" }, { status: 400 });
  }
  if (body.trim().length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `コメントは${MAX_BODY_LENGTH}文字以内です` },
      { status: 400 }
    );
  }

  const comment = await prisma.eventComment.create({
    data: {
      eventId: id,
      authorId: member.userId,
      body: body.trim(),
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  await audit(member.userId, "eventComment.create", "EventComment", comment.id);

  return NextResponse.json(comment, { status: 201 });
}
