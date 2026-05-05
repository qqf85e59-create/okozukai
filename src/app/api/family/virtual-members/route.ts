import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireParent, requireFamilyMember } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const virtualMembers = await prisma.virtualMember.findMany({
    where: { familyId: member.familyId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(virtualMembers);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";

  const member = await requireFamilyMember(userId);
  if (member instanceof NextResponse) return member;

  const err = requireParent(role);
  if (err) return err;

  const body = await req.json();
  const { displayName, colorTag } = body;

  if (!displayName?.trim()) {
    return NextResponse.json({ error: "displayName は必須です" }, { status: 400 });
  }

  const vm = await prisma.virtualMember.create({
    data: {
      familyId: member.familyId,
      displayName: displayName.trim(),
      colorTag: colorTag ?? null,
    },
  });

  await audit(member.userId, "virtualMember.create", "VirtualMember", vm.id);

  return NextResponse.json(vm, { status: 201 });
}
