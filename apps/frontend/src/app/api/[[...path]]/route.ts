import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  await import("@onroad/backend/load-env");
  const { dispatchApiRequest } = await import("@onroad/backend/dispatch");
  const apiRequest = Object.assign(request, {
    nextUrl: new URL(request.url),
  });
  return dispatchApiRequest(apiRequest);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
