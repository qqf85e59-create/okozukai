import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireParent, requireFamilyMember } from "@/lib/auth";
import { EventCategory } from "@/generated/prisma/enums";

const VALID_CATEGORIES = Object.values(EventCategory);

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  // プリセット（familyId=null）＋自家族テンプレート
  const templates = await prisma.eventTemplate.findMany({
    where: {
      OR: [{ familyId: null }, { familyId: member.familyId }],
    },
    orderBy: [{ familyId: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const err = requireParent(role);
  if (err) return err;

  const body = await req.json();
  const { name, category, defaultBudget, defaultLeadDays, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `category は ${VALID_CATEGORIES.join("|")} のいずれかです` },
      { status: 400 }
    );
  }

  const template = await prisma.eventTemplate.create({
    data: {
      familyId: member.familyId,
      name: name.trim(),
      category: category as EventCategory,
      defaultBudget: defaultBudget != null ? Number(defaultBudget) : null,
      defaultLeadDays: defaultLeadDays != null ? Number(defaultLeadDays) : null,
      description: description ?? null,
    },
  });

  await audit(member.userId, "eventTemplate.create", "EventTemplate", template.id);

  return NextResponse.json(template, { status: 201 });
}
