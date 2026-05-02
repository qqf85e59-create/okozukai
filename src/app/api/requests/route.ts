import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChild, isApprover } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  const status = url.searchParams.get("status");

  const where: any = {};
  if (status) where.status = status;

  // 子供は自分の申請のみ
  if (isChild(role)) {
    where.userId = userId;
  } else if (targetUserId) {
    where.userId = targetUserId;
  }

  const requests = await prisma.request.findMany({
    where,
    include: {
      item: true,
      user: { select: { id: true, displayName: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isChild(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let itemId: string;
  let note: string | undefined;
  let studyActualMin: string | undefined;
  let count: number;
  let files: File[] = [];

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    itemId = formData.get("itemId") as string;
    note = (formData.get("note") as string) || undefined;
    studyActualMin = (formData.get("studyActualMin") as string) || undefined;
    count = Number(formData.get("count"));
    files = formData.getAll("files") as File[];

    const MAX_SIZE = 5 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "ファイルサイズは5MB以下にしてください" }, { status: 400 });
      }
    }
  } else {
    const json = await req.json();
    itemId = json.itemId;
    note = json.note;
    studyActualMin = json.studyActualMin;
    count = json.count;
  }

  if (!itemId) return NextResponse.json({ error: "itemIdは必須です" }, { status: 400 });

  const appliedCount = Math.max(1, Math.min(20, Number(count) || 1));

  const item = await prisma.masterItem.findUnique({
    where: { id: itemId },
    include: { overrides: { where: { userId } } },
  });

  if (!item) return NextResponse.json({ error: "項目が見つかりません" }, { status: 404 });

  const override = item.overrides[0];
  let baseMin = override ? override.overrideMin : item.defaultMin;

  // 勉強時間（実時間申請）の場合は実際の時間を使用（回数は1固定）
  if (item.category === "study" && item.name === "勉強時間（実時間申請）" && studyActualMin) {
    baseMin = Number(studyActualMin);
  }

  const minutes = baseMin * appliedCount;

  const request = await prisma.request.create({
    data: { userId, itemId, minutes, count: appliedCount, note, studyActualMin: studyActualMin ? Number(studyActualMin) : null },
    include: { item: true },
  });

  // Handle files (e.g., save to storage and create Attachment records)
  // Currently, the schema has Attachment model but no storage is configured in this example yet.
  // In a real app, you'd upload them to S3/Cloudinary and create db records.
  if (files.length > 0) {
    // For now we just create dummy records or skip if there's no actual upload logic yet
    // To implement real upload, we'd add it here.
  }

  // Balance に accumulatedMin は未集計分なのでここでは加算しない（承認後に加算）
  return NextResponse.json(request, { status: 201 });
}
