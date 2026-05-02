import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role") ?? "";
  if (!isAdmin(role)) return NextResponse.json({ error: "管理者のみ" }, { status: 403 });

  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Build CSV with Shift_JIS BOM for Excel compatibility
  const BOM = "\uFEFF";
  const header = "日時,操作者,アクション,対象タイプ,対象ID,変更内容\n";
  const rows = logs.map((l) => {
    const date = new Date(l.createdAt).toLocaleString("ja-JP");
    const actor = l.actor.displayName;
    const diff = l.diff ? l.diff.replace(/"/g, '""') : "";
    return `"${date}","${actor}","${l.action}","${l.targetType}","${l.targetId}","${diff}"`;
  }).join("\n");

  const csv = BOM + header + rows;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit_log_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
