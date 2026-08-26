import {
  decodeVehicleImageData,
  findVehicleImageById,
  vehicleImageDataTag,
} from "./vehicle-image-service";
import { processReportColorPhotoBuffer } from "../lib/processVehicleImage";

const REPORT_COLOR_PHOTO_CACHE_VERSION = "3";
const reportColorPhotoCache = new Map<string, Buffer>();

/** On-demand background removal for quote-sheet color thumbnails (not stored in DB). */
export async function getReportColorPhotoBuffer(imageId: number): Promise<Buffer | null> {
  const image = await findVehicleImageById(imageId);
  if (!image) {
    return null;
  }

  const cacheKey = `${REPORT_COLOR_PHOTO_CACHE_VERSION}:${imageId}:${vehicleImageDataTag(image.data)}`;
  const cached = reportColorPhotoCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const source = decodeVehicleImageData(image.data);
  const processed = await processReportColorPhotoBuffer(source);
  reportColorPhotoCache.set(cacheKey, processed);
  return processed;
}
