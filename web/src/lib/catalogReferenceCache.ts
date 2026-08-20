import type { Category, Location } from "../types";

const CATEGORIES_KEY = "onroad-categories";
const LOCATIONS_KEY = "onroad-locations";

export function loadCategoryCache(): Category[] | null {
  const raw = sessionStorage.getItem(CATEGORIES_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Category[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCategoryCache(categories: Category[]) {
  sessionStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function loadLocationCache(): Location[] | null {
  const raw = sessionStorage.getItem(LOCATIONS_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Location[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocationCache(locations: Location[]) {
  sessionStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}
