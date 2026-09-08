/** Resolve a stored accessory image id or legacy path to a browser-loadable URL. */
export function accessoryImageUrl(idOrPath?: string | number | null): string {
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
    return `/api/accessory-images/${value}`;
  }
  return value;
}
