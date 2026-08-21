import { NextResponse } from "next/server";

export function json<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

export const CATALOG_LIST_CACHE_CONTROL = "public, max-age=60";

/** Rarely changing reference lists (categories, locations) — longer browser/CDN cache. */
export const STATIC_REFERENCE_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400";

export function error(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export function unauthorized(message = "Sign in required") {
  return error(message, 401);
}

export function forbidden(message = "Forbidden") {
  return error(message, 403);
}

export function notFound(resource: string, id?: string | number) {
  const label = id == null ? resource : `${resource} ${id}`;
  return error(`${label} not found`, 404);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
