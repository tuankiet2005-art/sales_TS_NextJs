import { colorPhotoIdsForSlide } from "./colorPhotos";
import { colorPhoto } from "./vehicleColor";
import type { ColorPhotoMap } from "./colorPhotos";

export function buildColorSlideUrls(
  color: string | undefined,
  colorPhotos?: ColorPhotoMap | null,
  defaultColor?: string,
): string[] {
  const slides = colorPhotoIdsForSlide(colorPhotos, color, defaultColor);
  if (slides.length > 0) {
    return slides;
  }
  const name = color?.trim() || defaultColor?.trim();
  if (!name) {
    return [];
  }
  return [colorPhoto(name, colorPhotos ?? undefined)];
}
