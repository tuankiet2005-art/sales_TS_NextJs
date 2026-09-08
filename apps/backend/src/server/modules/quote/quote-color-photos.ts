import { firstColorPhotoId, parseColorPhotosJson } from "@onroad/shared/catalog/colorPhotos";
import { orderedReportColors } from "@onroad/shared/quote/colorGridLayout";

import { getReportColorPhotoBuffer } from "../media/report-color-photo.service";
import { decodeVehicleImageData, findVehicleImageById } from "../media/vehicle-image.service";

export type QuoteColorGridImage = {
  name: string;
  buffer: Buffer;
};

export async function resolveQuoteColorGridImages(
  colorPhotosJson?: string | null,
  colorNames?: string[] | null,
): Promise<QuoteColorGridImage[]> {
  const photos = parseColorPhotosJson(colorPhotosJson);
  const names = orderedReportColors(colorNames ?? []);
  const images: QuoteColorGridImage[] = [];

  for (const name of names) {
    const photoId = Number(firstColorPhotoId(photos, name));
    if (!Number.isFinite(photoId) || photoId <= 0) {
      continue;
    }
    const processed = await getReportColorPhotoBuffer(photoId);
    if (processed) {
      images.push({ name, buffer: processed });
      continue;
    }
    const row = await findVehicleImageById(photoId);
    if (row?.data) {
      images.push({ name, buffer: decodeVehicleImageData(row.data) });
    }
  }

  return images;
}
