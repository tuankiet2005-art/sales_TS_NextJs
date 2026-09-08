export const runtime = "nodejs";

import { json, CATALOG_LIST_CACHE_CONTROL } from "@/server/shared/http";
import { getBrands } from "@/server/modules/catalog/catalog.service";

export async function GET() {
  return json(await getBrands(), 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
