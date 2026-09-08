/** Standard Web Request/Response helpers (no Next.js dependency). */

/** Web Request with nextUrl for migrated App Router handlers. */
export type NextRequest = Request & { nextUrl: URL };

type JsonStatus = number | { status?: number; headers?: Record<string, string> };

export function json<T>(
  data: T,
  statusOrInit: JsonStatus = 200,
  headers?: Record<string, string>,
) {
  let status = 200;
  let mergedHeaders = headers ?? {};
  if (typeof statusOrInit === "number") {
    status = statusOrInit;
  } else {
    status = statusOrInit.status ?? 200;
    mergedHeaders = { ...statusOrInit.headers, ...mergedHeaders };
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...mergedHeaders },
  });
}

/** Parse JSON request bodies from migrated Next.js route handlers. */
export async function readJsonBody(request: Request): Promise<any> {
  return request.json().catch(() => null);
}

export const CATALOG_LIST_CACHE_CONTROL = "public, max-age=60";

export const STATIC_REFERENCE_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400";

export function error(message: string, status = 400) {
  return json({ message }, status);
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
  return new Response(null, { status: 204 });
}
