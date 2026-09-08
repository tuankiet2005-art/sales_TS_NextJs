import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  try {
    await import("@onroad/backend/load-env");
    const { dispatchApiRequest } = await import("@onroad/backend/dispatch");
    return dispatchApiRequest(request);
  } catch (error) {
    console.error("[api] unhandled error", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
