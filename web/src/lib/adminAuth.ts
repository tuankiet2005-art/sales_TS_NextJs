import type { OperatorRole } from "../types";

const TOKEN_KEY = "onroad-admin-token";
const ROLE_KEY = "onroad-operator-role";
export const ADMIN_AUTH_EVENT = "onroad-admin-auth";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function getOperatorRole(): OperatorRole | null {
  if (typeof window === "undefined") {
    return null;
  }
  const role = localStorage.getItem(ROLE_KEY);
  return role === "admin" || role === "sales" ? role : null;
}

export function isAdminSignedIn(): boolean {
  return Boolean(getAdminToken());
}

export function setAdminSession(token: string, role: OperatorRole) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

/** @deprecated Use setAdminSession */
export function setAdminToken(token: string) {
  setAdminSession(token, "admin");
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
}

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/health",
  "/api/brands",
  "/api/vehicle-categories",
  "/api/locations",
  "/api/dealer-policy",
  "/api/catalog",
  "/api/vehicles",
  "/api/vehicle-images",
] as const;

export function isPublicApiPath(path: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
  );
}
