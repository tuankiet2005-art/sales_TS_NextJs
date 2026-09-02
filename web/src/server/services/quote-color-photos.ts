import { firstColorPhotoId, parseColorPhotosJson } from "@/lib/colorPhotos";

import { getReportColorPhotoBuffer } from "./report-color-photo-service";
import { decodeVehicleImageData, findVehicleImageById } from "./vehicle-image-service";

const REPORT_COLOR_SLOTS = ["Bạc", "Nâu", "Đen", "Trắng"] as const;

function slotColorNames(colorNames: string[]): string[] {
  const available = colorNames.map((name) => name.trim()).filter(Boolean);
  const set = new Set(available);
  const slots: string[] = REPORT_COLOR_SLOTS.map((name) => (set.has(name) ? name : ""));
  const extras = available.filter(
    (name) => !REPORT_COLOR_SLOTS.includes(name as (typeof REPORT_COLOR_SLOTS)[number]),
  );
  for (let index = 0; index < slots.length && extras.length > 0; index += 1) {
    if (!slots[index]) {
      slots[index] = extras.shift()!;
    }
  }
  return slots;
}

export type QuoteColorGridImage = {
  name: string;
  buffer: Buffer;
};

export async function resolveQuoteColorGridImages(
  colorPhotosJson?: string | null,
  colorNames?: string[] | null,
): Promise<QuoteColorGridImage[]> {
  const photos = parseColorPhotosJson(colorPhotosJson);
  const slots = slotColorNames(colorNames ?? []);
  const images: QuoteColorGridImage[] = [];

  for (const name of slots) {
    if (!name) {
      continue;
    }
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
