import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = req.headers.get("x-user-role") ?? "";
  const actorId = req.headers.get("x-user-id") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { displayName, birthDate, gradeOverride, exchangeRate, colorToken, isActive } = body;

  if (!displayName || typeof displayName !== "string" || displayName.trim() === "") {
    return NextResponse.json({ error: "displayName is required" }, { status: 400 });
  }

  const diff: Record<string, unknown> = {};
  if (displayName !== existing.displayName) diff.displayName = [existing.displayName, displayName];
  if (birthDate !== undefined) {
    const newDate = birthDate ? new Date(birthDate) : null;
    const oldDate = existing.birthDate;
    if (String(newDate) !== String(oldDate)) diff.birthDate = [oldDate, newDate];
  }
  if (gradeOverride !== undefined && gradeOverride !== existing.gradeOverride)
    diff.gradeOverride = [existing.gradeOverride, gradeOverride ?? null];
  if (exchangeRate !== undefined && exchangeRate !== existing.exchangeRate)
    diff.exchangeRate = [existing.exchangeRate, exchangeRate ?? null];
  if (colorToken !== undefined && colorToken !== existing.colorToken)
    diff.colorToken = [existing.colorToken, colorToken ?? null];
  if (isActive !== undefined && isActive !== existing.isActive)
    diff.isActive = [existing.isActive, isActive];

  const updated = await prisma.user.update({
    where: { id },
    data: {
      displayName: displayName.trim(),
      birthDate: birthDate ? new Date(birthDate) : null,
      gradeOverride: gradeOverride ?? null,
      exchangeRate: exchangeRate != null ? Number(exchangeRate) : null,
      colorToken: colorToken ?? null,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    },
  });

  if (Object.keys(diff).length > 0) {
    await audit(actorId, "admin.user.update", "User", id, diff);
  }

  return NextResponse.json({ id: updated.id, displayName: updated.displayName });
}
