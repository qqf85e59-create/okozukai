import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireParent, requireFamilyMember } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const err = requireParent(role);
  if (err) return err;

  const { id } = await params;

  // family スコープ確認
  const vm = await prisma.virtualMember.findUnique({
    where: { id },
    select: { id: true, familyId: true },
  });
  if (!vm || vm.familyId !== member.familyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // EventParticipant 削除 → VirtualMember 削除（トランザクション）
  await prisma.$transaction(async (tx) => {
    await tx.eventParticipant.deleteMany({ where: { virtualMemberId: id } });
    await tx.virtualMember.delete({ where: { id } });
  });

  await audit(member.userId, "virtualMember.delete", "VirtualMember", id);

  return NextResponse.json({ ok: true });
}
