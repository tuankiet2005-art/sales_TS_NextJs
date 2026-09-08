export const runtime = "nodejs";

import { json, CATALOG_LIST_CACHE_CONTROL } from "@/server/shared/http";
import { listActiveAccessories } from "@/server/modules/accessory/accessory.service";

export async function GET() {
  return json(await listActiveAccessories(), 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
