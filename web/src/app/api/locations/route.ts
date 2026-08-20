export const runtime = "nodejs";

import { json, CATALOG_LIST_CACHE_CONTROL } from "@/server/http";
import { getLocations } from "@/server/services/catalog-service";

export async function GET() {
  return json(await getLocations(), 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
