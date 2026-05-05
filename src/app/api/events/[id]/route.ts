import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireParent, requireFamilyMember, assertEventInFamily } from "@/lib/auth";
import { EventCategory } from "@/generated/prisma/enums";

const VALID_CATEGORIES = Object.values(EventCategory);

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

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          user: { select: { id: true, displayName: true } },
          virtualMember: true,
        },
      },
      comments: {
        include: { author: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: "desc" },
      },
      reactions: {
        include: { user: { select: { id: true, displayName: true } } },
      },
      retrospective: true,
    },
  });

  return NextResponse.json(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const { id } = await params;

  const existing = await prisma.event.findUnique({
    where: { id, familyId: member.familyId },
    select: {
      id: true,
      createdById: true,
      familyId: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      allDay: true,
      location: true,
      category: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // PARENT ロール、または作成者本人のみ更新可
  const parentErr = requireParent(role);
  if (parentErr && existing.createdById !== member.userId) return parentErr;

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description ?? null;
  if (body.startAt !== undefined) updateData.startAt = new Date(body.startAt);
  if (body.endAt !== undefined) updateData.endAt = body.endAt ? new Date(body.endAt) : null;
  if (body.allDay !== undefined) updateData.allDay = body.allDay;
  if (body.location !== undefined) updateData.location = body.location ?? null;
  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `category は ${VALID_CATEGORIES.join("|")} のいずれかです` },
        { status: 400 }
      );
    }
    updateData.category = body.category as EventCategory;
  }

  const before = {
    title: existing.title,
    description: existing.description,
    startAt: existing.startAt,
    endAt: existing.endAt,
    allDay: existing.allDay,
    location: existing.location,
    category: existing.category,
  };

  const updated = await prisma.event.update({ where: { id }, data: updateData });
  await audit(member.userId, "event.update", "Event", id, { before, after: updateData });

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

  const parentErr = requireParent(role);
  if (parentErr) return parentErr;

  const { id } = await params;
  const scopeErr = await assertEventInFamily(id, member.familyId);
  if (scopeErr) return scopeErr;

  await prisma.event.delete({ where: { id } });
  await audit(member.userId, "event.delete", "Event", id);

  return NextResponse.json({ ok: true });
}
