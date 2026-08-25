export const runtime = "nodejs";

import { NextResponse } from "next/server";

import {
  decodeAccessoryImageData,
  findAccessoryImageById,
} from "@/server/services/accessory-image-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ message: "Invalid image id" }, { status: 400 });
  }

  const image = await findAccessoryImageById(id);
  if (!image) {
    return NextResponse.json({ message: "Image not found" }, { status: 404 });
  }

  const body = decodeAccessoryImageData(image.data);
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
