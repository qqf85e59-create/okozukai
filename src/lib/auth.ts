import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "okozukai-secret-change-in-production"
);

export type JWTPayload = {
  userId: string;
  role: string;
};

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function isApprover(role: string) {
  return role === "approver" || role === "admin";
}

export function isAdmin(role: string) {
  return role === "admin";
}

export function isChild(role: string) {
  return role === "child";
}

// ── Phase 2: Family-scoped auth helpers ──

/** ユーザーの familyId を DB から取得する */
export async function getUserFamilyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyId: true },
  });
  return user?.familyId ?? null;
}

/**
 * 認証済みかつ familyId を持つユーザー情報を返す。
 * 失敗時は NextResponse（401/403）を返す。
 * 呼び出し側: if (member instanceof NextResponse) return member;
 */
export async function requireFamilyMember(
  userId: string | null
): Promise<{ userId: string; familyId: string } | NextResponse> {
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await getUserFamilyId(userId);
  if (!familyId) return NextResponse.json({ error: "Family not found" }, { status: 403 });
  return { userId, familyId };
}

/**
 * PARENT ロール（approver/admin）でなければ 403 NextResponse を返す。
 * OK なら null。
 */
export function requireParent(role: string): NextResponse | null {
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/**
 * イベントが指定 familyId に属するか確認する。
 * 属さない場合は 404 NextResponse を返す。OK なら null。
 */
export async function assertEventInFamily(
  eventId: string,
  familyId: string
): Promise<NextResponse | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { familyId: true },
  });
  if (!event || event.familyId !== familyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/**
 * 2ユーザーが同じ familyId に属するか確認する。
 * 異なる場合は 403 NextResponse を返す。OK なら null。
 */
export async function assertSameFamily(
  targetUserId: string,
  currentUserId: string
): Promise<NextResponse | null> {
  const [target, current] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId }, select: { familyId: true } }),
    prisma.user.findUnique({ where: { id: currentUserId }, select: { familyId: true } }),
  ]);
  if (!target || !current || target.familyId !== current.familyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
