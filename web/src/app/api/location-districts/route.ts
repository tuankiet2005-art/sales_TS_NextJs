export const runtime = "nodejs";

import { error, json, STATIC_REFERENCE_CACHE_CONTROL } from "@/server/http";
import { getLocationDistricts } from "@/server/services/catalog-service";

export async function GET(request: Request) {
  const locationId = Number(new URL(request.url).searchParams.get("locationId"));
  if (!locationId) {
    return error("locationId is required");
  }
  return json(await getLocationDistricts(locationId), 200, { "Cache-Control": STATIC_REFERENCE_CACHE_CONTROL });
}
