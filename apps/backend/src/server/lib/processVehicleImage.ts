import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";

import { isReportColorBackgroundRemovedOnServer } from "./reportColorBgRemoval";

export { isReportColorBackgroundRemovedOnServer } from "./reportColorBgRemoval";

async function encodeReportColorPhotoWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .webp({
      quality: 92,
      alphaQuality: 100,
      effort: 4,
    })
    .toBuffer();
}

/** Remove background and encode as WebP for batch reprocessing scripts. */
export async function processVehicleImageBuffer(buffer: Buffer): Promise<Buffer> {
  const pngBuffer = await sharp(buffer).png().toBuffer();
  const cutout = await removeBackground(new Blob([new Uint8Array(pngBuffer)], { type: "image/png" }), {
    model: "medium",
    output: {
      format: "image/png",
      quality: 1,
    },
  });
  const pngCutout = Buffer.from(await cutout.arrayBuffer());
  return sharp(pngCutout).webp({ quality: 85, alphaQuality: 90 }).toBuffer();
}

/** High-quality cutout for quote-sheet color thumbnails (not stored in DB). */
export async function processReportColorPhotoBuffer(buffer: Buffer): Promise<Buffer> {
  if (!isReportColorBackgroundRemovedOnServer()) {
    return encodeReportColorPhotoWebp(buffer);
  }

  try {
    const pngBuffer = await sharp(buffer).rotate().png().toBuffer();
    const cutout = await removeBackground(new Blob([new Uint8Array(pngBuffer)], { type: "image/png" }), {
      model: "medium",
      output: {
        format: "image/png",
        quality: 1,
      },
    });
    const pngCutout = Buffer.from(await cutout.arrayBuffer());
    return sharp(pngCutout)
      .webp({
        quality: 92,
        alphaQuality: 100,
        effort: 4,
      })
      .toBuffer();
  } catch (error) {
    console.warn("report color photo background removal failed, using source image", error);
    return encodeReportColorPhotoWebp(buffer);
  }
}
