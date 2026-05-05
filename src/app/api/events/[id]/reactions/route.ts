import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamilyMember, assertEventInFamily } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

const ALLOWED_EMOJIS = ["👍", "❤️", "🎉", "👏", "🙏"] as const;
type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

function isAllowedEmoji(v: unknown): v is AllowedEmoji {
  return ALLOWED_EMOJIS.includes(v as AllowedEmoji);
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

  const { emoji } = await req.json();
  if (!isAllowedEmoji(emoji)) {
    return NextResponse.json(
      { error: `emoji は ${ALLOWED_EMOJIS.join(" ")} のいずれかです` },
      { status: 400 }
    );
  }

  try {
    const reaction = await prisma.eventReaction.create({
      data: { eventId: id, userId: member.userId, emoji },
    });
    return NextResponse.json(reaction, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "既にリアクション済みです" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const scopeErr = await assertEventInFamily(id, member.familyId);
  if (scopeErr) return scopeErr;

  // emoji はクエリパラメータ優先、なければ body から取得
  const url = new URL(req.url);
  let emoji: unknown = url.searchParams.get("emoji");
  if (!emoji) {
    try {
      const body = await req.json();
      emoji = body.emoji;
    } catch {
      // body なし
    }
  }

  if (!isAllowedEmoji(emoji)) {
    return NextResponse.json(
      { error: `emoji は ${ALLOWED_EMOJIS.join(" ")} のいずれかです` },
      { status: 400 }
    );
  }

  const reaction = await prisma.eventReaction.findUnique({
    where: { eventId_userId_emoji: { eventId: id, userId: member.userId, emoji } },
  });
  if (!reaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.eventReaction.delete({
    where: { eventId_userId_emoji: { eventId: id, userId: member.userId, emoji } },
  });

  return NextResponse.json({ ok: true });
}
