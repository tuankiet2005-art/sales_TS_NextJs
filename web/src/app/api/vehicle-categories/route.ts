export const runtime = "nodejs";

import { json, CATALOG_LIST_CACHE_CONTROL } from "@/server/http";
import { getCategories } from "@/server/services/catalog-service";

export async function GET() {
  return json(await getCategories(), 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
