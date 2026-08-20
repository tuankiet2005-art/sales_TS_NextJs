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
    return value;
  }
  if (/^\d+$/.test(value)) {
    return `/api/vehicle-images/${value}`;
  }
  return value;
}

export function isStoredImageId(value?: string | null): boolean {
  return Boolean(value?.trim() && /^\d+$/.test(value.trim()));
}
