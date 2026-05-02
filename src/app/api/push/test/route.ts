import { NextRequest, NextResponse } from "next/server";
import { notifyUser } from "@/lib/push";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await notifyUser(userId, {
    title: "テスト通知",
    body: "おもちゃ箱バンクからのテスト通知です",
    url: "/settings",
  });

  return NextResponse.json({ ok: true });
}
