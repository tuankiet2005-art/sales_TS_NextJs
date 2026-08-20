export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { json, CATALOG_LIST_CACHE_CONTROL } from "@/server/http";
import { getVehicleFilterOptions } from "@/server/services/catalog-service";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const brand = params.get("brand") ?? undefined;
  const categoryId = params.get("categoryId") ? Number(params.get("categoryId")) : undefined;
  return json(await getVehicleFilterOptions(brand, categoryId), 200, {
    "Cache-Control": CATALOG_LIST_CACHE_CONTROL,
  });
}
