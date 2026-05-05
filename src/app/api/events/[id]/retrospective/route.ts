import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireParent, requireFamilyMember, assertEventInFamily } from "@/lib/auth";

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

  const retrospective = await prisma.eventRetrospective.findUnique({
    where: { eventId: id },
  });

  return NextResponse.json(retrospective ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;

  // family スコープ確認 + createdBy 取得を同時に行う
  const event = await prisma.event.findUnique({
    where: { id, familyId: member.familyId },
    select: { id: true, createdById: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // PARENT ロールまたは作成者本人のみ更新可
  const parentErr = requireParent(role);
  if (parentErr && event.createdById !== member.userId) return parentErr;

  const body = await req.json();
  const { plannedAmount, actualAmount, note } = body;

  const data = {
    plannedAmount: plannedAmount != null ? Number(plannedAmount) : null,
    actualAmount: actualAmount != null ? Number(actualAmount) : null,
    note: note ?? null,
  };

  const retrospective = await prisma.eventRetrospective.upsert({
    where: { eventId: id },
    create: { eventId: id, ...data },
    update: data,
  });

  await audit(member.userId, "event.retrospective.update", "EventRetrospective", retrospective.id);

  return NextResponse.json(retrospective);
}
