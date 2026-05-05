import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { isChild, requireFamilyMember } from "@/lib/auth";

async function getGoalWithAccess(
  id: string,
  member: { userId: string; familyId: string },
  role: string
) {
  const goal = await prisma.savingsGoal.findUnique({
    where: { id },
    include: { user: { select: { familyId: true } } },
  });
  if (!goal) return null;
  if (isChild(role)) {
    if (goal.userId !== member.userId) return null;
  } else {
    if (goal.user.familyId !== member.familyId) return null;
  }
  return goal;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const goal = await getGoalWithAccess(id, member, role);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { eventId, syncTargetDate } = body;

  if (!eventId) return NextResponse.json({ error: "eventId は必須です" }, { status: 400 });

  // イベントが同 family 所属かチェック
  const event = await prisma.event.findUnique({
    where: { id: eventId, familyId: member.familyId },
    select: { id: true, startAt: true },
  });
  if (!event) return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: {
      linkedEventId: eventId,
      ...(syncTargetDate && { targetDate: event.startAt }),
    },
  });

  await audit(member.userId, "goal.linkEvent", "SavingsGoal", id, { eventId });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;
  const goal = await getGoalWithAccess(id, member, role);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: { linkedEventId: null },
  });

  await audit(member.userId, "goal.unlinkEvent", "SavingsGoal", id);

  return NextResponse.json(updated);
}
