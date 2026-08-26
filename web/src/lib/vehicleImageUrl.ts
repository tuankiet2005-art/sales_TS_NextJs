/** Bump when existing vehicle_images blobs are reprocessed in place. */
const VEHICLE_IMAGE_CACHE_VERSION = "2";

/** Resolve a stored image id or legacy path to a browser-loadable URL. */
export function vehicleImageUrl(idOrPath?: string | number | null): string {
  if (idOrPath == null || idOrPath === "") {
    return "";
  }
  const value = String(idOrPath).trim();
  if (!value) {
    return "";
  }
  if (value.startsWith("/api/") || value.startsWith("http://") || value.startsWith("https://")) {
    const [pathPart, query = ""] = value.split("?", 2);
    if (/^\/api\/vehicle-images\/\d+$/.test(pathPart)) {
      const params = new URLSearchParams(query);
      params.set("v", VEHICLE_IMAGE_CACHE_VERSION);
      return `${pathPart}?${params.toString()}`;
    }
    return value;
  }
  if (/^\d+$/.test(value)) {
    return `/api/vehicle-images/${value}?v=${VEHICLE_IMAGE_CACHE_VERSION}`;
  }
  return value;
}

export function isStoredImageId(value?: string | null): boolean {
  return Boolean(value?.trim() && /^\d+$/.test(value.trim()));
}
