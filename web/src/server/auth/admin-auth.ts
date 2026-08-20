import { createHmac, timingSafeEqual } from "node:crypto";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function same(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = Buffer.from(left ?? "");
  const b = Buffer.from(right ?? "");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function issueAdminToken(): string {
  const username = env("ADMIN_USERNAME");
  const password = env("ADMIN_PASSWORD");
  const secret = env("ADMIN_TOKEN_SECRET");
  return createHmac("sha256", secret)
    .update(`${username}:${password}`)
    .digest("hex");
}

export function loginAdmin(username: string, password: string): string | null {
  if (!same(username, process.env.ADMIN_USERNAME) || !same(password, process.env.ADMIN_PASSWORD)) {
    return null;
  }
  return issueAdminToken();
}

export function isAuthorizedAdmin(authorizationHeader: string | null): boolean {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }
  const token = authorizationHeader.slice("Bearer ".length).trim();
  try {
    return same(token, issueAdminToken());
  } catch {
    return false;
  }
}
