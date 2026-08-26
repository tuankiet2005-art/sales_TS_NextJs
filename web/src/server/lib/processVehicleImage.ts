import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";

/** Remove background and encode as WebP for batch reprocessing scripts. */
export async function processVehicleImageBuffer(buffer: Buffer): Promise<Buffer> {
  const pngBuffer = await sharp(buffer).png().toBuffer();
  const cutout = await removeBackground(new Blob([pngBuffer], { type: "image/png" }), {
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
  const pngBuffer = await sharp(buffer).rotate().png().toBuffer();
  const cutout = await removeBackground(new Blob([pngBuffer], { type: "image/png" }), {
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
}
