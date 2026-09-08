import { vehicleImageUrl } from "./vehicleImageUrl";

export type ColorPhotoMap = Record<string, string[]>;

/** Parse DB/admin JSON — supports legacy `"Trắng": "123"` and `"Trắng": ["123","456"]`. */
export function normalizeColorPhotos(raw: unknown): ColorPhotoMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const result: ColorPhotoMap = {};
  for (const [color, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      const ids = value.map((item) => String(item).trim()).filter(Boolean);
      if (ids.length > 0) {
        result[color] = ids;
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      result[color] = [value.trim()];
    }
  }
  return result;
}

export function parseColorPhotosJson(value: string | null | undefined): ColorPhotoMap {
  if (!value?.trim()) {
    return {};
  }
  try {
    return normalizeColorPhotos(JSON.parse(value));
  } catch {
    return {};
  }
}

export function resolveColorPhotoMap(raw: ColorPhotoMap): ColorPhotoMap {
  const resolved: ColorPhotoMap = {};
  for (const [color, ids] of Object.entries(raw)) {
    resolved[color] = ids.map((id) => vehicleImageUrl(id)).filter(Boolean);
  }
  return resolved;
}

export function firstColorPhotoId(photos: ColorPhotoMap, color?: string): string {
  if (!color) {
    return "";
  }
  return photos[color]?.[0]?.trim() ?? "";
}

export function firstResolvedColorPhoto(
  photos: ColorPhotoMap | null | undefined,
  color?: string,
): string {
  if (!color || !photos) {
    return "";
  }
  return photos[color]?.[0] ?? "";
}

export function colorPhotoIdsForSlide(
  photos: ColorPhotoMap | null | undefined,
  color?: string,
  defaultColor?: string,
): string[] {
  const name = color?.trim() || defaultColor?.trim();
  if (!name || !photos) {
    return [];
  }
  return (photos[name] ?? []).filter(Boolean);
}
