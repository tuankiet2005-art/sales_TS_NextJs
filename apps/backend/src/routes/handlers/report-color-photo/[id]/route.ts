export const runtime = "nodejs";

import { error, json } from "@/server/shared/http";

import { isReportColorBackgroundRemovedOnServer } from "@/server/lib/reportColorBgRemoval";
import { getReportColorPhotoBuffer } from "@/server/modules/media/report-color-photo.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return error("Invalid image id", 400);
  }

  const body = await getReportColorPhotoBuffer(id);
  if (!body) {
    return error("Image not found", 404);
  }

  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400",
      "X-Report-Bg-Removed": isReportColorBackgroundRemovedOnServer() ? "1" : "0",
    },
  });
}
