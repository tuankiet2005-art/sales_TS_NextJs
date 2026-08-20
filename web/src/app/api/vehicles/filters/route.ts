export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { json, CATALOG_LIST_CACHE_CONTROL } from "@/server/http";
import { getVehicleFilterOptions } from "@/server/services/catalog-service";

export async function GET(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get("brand") ?? undefined;
  return json(await getVehicleFilterOptions(brand), 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
