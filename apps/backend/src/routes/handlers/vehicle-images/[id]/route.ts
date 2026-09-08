export const runtime = "nodejs";

import { error, json } from "@/server/shared/http";

import { decodeVehicleImageData, findVehicleImageById, vehicleImageDataTag } from "@/server/modules/media/vehicle-image.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return error("Invalid image id", 400);
  }

  const image = await findVehicleImageById(id);
  if (!image) {
    return error("Image not found", 404);
  }

  const body = decodeVehicleImageData(image.data);
  const etag = `"${vehicleImageDataTag(image.data)}"`;
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": image.mimeType,
      ETag: etag,
      "Cache-Control": "public, max-age=86400, must-revalidate",
    },
  });
}
