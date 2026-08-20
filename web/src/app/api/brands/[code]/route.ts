export const runtime = "nodejs";

import { json, notFound, CATALOG_LIST_CACHE_CONTROL } from "@/server/http";
import { getBrand } from "@/server/services/catalog-service";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const brand = await getBrand(code);
  if (!brand) {
    return notFound("Brand", code);
  }
  return json(brand, 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
