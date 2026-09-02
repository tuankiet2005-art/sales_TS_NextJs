export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { isReportColorBackgroundRemovedOnServer } from "@/server/lib/reportColorBgRemoval";
import { getReportColorPhotoBuffer } from "@/server/services/report-color-photo-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ message: "Invalid image id" }, { status: 400 });
  }

  const body = await getReportColorPhotoBuffer(id);
  if (!body) {
    return NextResponse.json({ message: "Image not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400",
      "X-Report-Bg-Removed": isReportColorBackgroundRemovedOnServer() ? "1" : "0",
    },
  });
}
