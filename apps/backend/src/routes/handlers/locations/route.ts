export const runtime = "nodejs";

import { json, STATIC_REFERENCE_CACHE_CONTROL } from "@/server/shared/http";
import { getLocations } from "@/server/modules/catalog/catalog.service";

export async function GET() {
  return json(await getLocations(), 200, { "Cache-Control": STATIC_REFERENCE_CACHE_CONTROL });
}
