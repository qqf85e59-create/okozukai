import { NextRequest, NextResponse } from "next/server";
import { isApprover } from "@/lib/auth";
import { runSettlement } from "@/lib/settlement";

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isApprover(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await runSettlement();
  return NextResponse.json(result);
}
