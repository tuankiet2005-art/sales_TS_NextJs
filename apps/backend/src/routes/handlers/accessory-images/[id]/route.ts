export const runtime = "nodejs";

import { error, json } from "@/server/shared/http";

import {
  decodeAccessoryImageData,
  findAccessoryImageById,
} from "@/server/modules/accessory/accessory-image.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return error("Invalid image id", 400);
  }

  const image = await findAccessoryImageById(id);
  if (!image) {
    return error("Image not found", 404);
  }

  const body = decodeAccessoryImageData(image.data);
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
