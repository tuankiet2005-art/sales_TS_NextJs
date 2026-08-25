/** URL slug for a catalog model line (brand-scoped model name). */
export function modelToSlug(model: string): string {
  return encodeURIComponent(model.trim());
}

export function slugToModel(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}
