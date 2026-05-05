import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireParent, requireFamilyMember } from "@/lib/auth";
import { ParticipantRole } from "@/generated/prisma/enums";

const VALID_ROLES = Object.values(ParticipantRole);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;

  // イベント取得（family スコープ確認 + createdBy 取得を同時に）
  const event = await prisma.event.findUnique({
    where: { id, familyId: member.familyId },
    select: { id: true, createdById: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // PARENT ロールまたは作成者本人のみ更新可
  const parentErr = requireParent(role);
  if (parentErr && event.createdById !== member.userId) return parentErr;

  const body = await req.json();
  const { participants } = body;

  if (!Array.isArray(participants)) {
    return NextResponse.json({ error: "participants は配列です" }, { status: 400 });
  }

  // 各参加者のバリデーション
  for (const p of participants) {
    if (!p.role || !VALID_ROLES.includes(p.role)) {
      return NextResponse.json(
        { error: `参加者 role が不正です: ${p.role}` },
        { status: 400 }
      );
    }
    if (!p.userId && !p.virtualMemberId) {
      return NextResponse.json(
        { error: "参加者には userId または virtualMemberId が必要です" },
        { status: 400 }
      );
    }
    // userId は同 family 所属チェック
    if (p.userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: p.userId },
        select: { familyId: true },
      });
      if (!targetUser || targetUser.familyId !== member.familyId) {
        return NextResponse.json(
          { error: `userId ${p.userId} は同じ家族ではありません` },
          { status: 400 }
        );
      }
    }
    // virtualMemberId は同 family 所属チェック
    if (p.virtualMemberId) {
      const vm = await prisma.virtualMember.findUnique({
        where: { id: p.virtualMemberId },
        select: { familyId: true },
      });
      if (!vm || vm.familyId !== member.familyId) {
        return NextResponse.json(
          { error: `virtualMemberId ${p.virtualMemberId} は同じ家族ではありません` },
          { status: 400 }
        );
      }
    }
  }

  // 既存参加者を全削除 → 新規作成（トランザクション）
  const updated = await prisma.$transaction(async (tx) => {
    await tx.eventParticipant.deleteMany({ where: { eventId: id } });
    await tx.eventParticipant.createMany({
      data: (participants as { userId?: string; virtualMemberId?: string; role: string }[]).map(
        (p) => ({
          eventId: id,
          userId: p.userId ?? null,
          virtualMemberId: p.virtualMemberId ?? null,
          role: p.role as ParticipantRole,
        })
      ),
    });
    return tx.eventParticipant.findMany({
      where: { eventId: id },
      include: {
        user: { select: { id: true, displayName: true } },
        virtualMember: true,
      },
    });
  });

  await audit(member.userId, "event.participants.update", "Event", id, {
    count: updated.length,
  });

  return NextResponse.json(updated);
}
