export const runtime = "nodejs";

import { NextRequest } from "@/server/shared/http";

import { CATALOG_LIST_CACHE_CONTROL, json, notFound } from "@/server/shared/http";
import { getCatalogBootstrap } from "@/server/modules/catalog/catalog.service";

export async function GET(request: NextRequest) {
  const brandCode = request.nextUrl.searchParams.get("brand") ?? "";
  if (!brandCode.trim()) {
    return json({ message: "brand query parameter is required" }, 400);
  }
  const bootstrap = await getCatalogBootstrap(brandCode);
  if (!bootstrap) {
    return notFound("Brand", brandCode);
  }
  return json(bootstrap, 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
