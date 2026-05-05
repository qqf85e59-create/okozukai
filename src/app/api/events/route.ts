import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireParent, requireFamilyMember } from "@/lib/auth";
import { EventCategory, ParticipantRole } from "@/generated/prisma/enums";

const VALID_CATEGORIES = Object.values(EventCategory);
const VALID_ROLES = Object.values(ParticipantRole);

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const category = url.searchParams.get("category");
  const participantUserId = url.searchParams.get("participantUserId");

  const events = await prisma.event.findMany({
    where: {
      familyId: member.familyId,
      ...(from && !isNaN(Date.parse(from)) && { startAt: { gte: new Date(from) } }),
      ...(to && !isNaN(Date.parse(to)) && { startAt: { lte: new Date(to) } }),
      ...(category && VALID_CATEGORIES.includes(category as EventCategory) && {
        category: category as EventCategory,
      }),
      ...(participantUserId && { participants: { some: { userId: participantUserId } } }),
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, displayName: true } },
          virtualMember: true,
        },
      },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const err = requireParent(role);
  if (err) return err;

  const body = await req.json();
  const {
    title,
    description,
    startAt,
    endAt,
    allDay,
    location,
    category,
    templateId,
    participants = [],
  } = body;

  if (!title) return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  if (!startAt || isNaN(Date.parse(startAt))) {
    return NextResponse.json({ error: "startAt は必須かつ正しい日付形式です" }, { status: 400 });
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `category は ${VALID_CATEGORIES.join("|")} のいずれかです` },
      { status: 400 }
    );
  }

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
  }

  const event = await prisma.event.create({
    data: {
      familyId: member.familyId,
      title,
      description: description ?? null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      allDay: allDay ?? false,
      location: location ?? null,
      category: category as EventCategory,
      createdById: member.userId,
      templateId: templateId ?? null,
      participants: {
        create: (participants as { userId?: string; virtualMemberId?: string; role: string }[]).map(
          (p) => ({
            userId: p.userId ?? null,
            virtualMemberId: p.virtualMemberId ?? null,
            role: p.role as ParticipantRole,
          })
        ),
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, displayName: true } },
          virtualMember: true,
        },
      },
    },
  });

  await audit(member.userId, "event.create", "Event", event.id);

  return NextResponse.json(event, { status: 201 });
}
