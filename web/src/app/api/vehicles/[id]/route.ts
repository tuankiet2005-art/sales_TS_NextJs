export const runtime = "nodejs";

import { json, notFound, CATALOG_LIST_CACHE_CONTROL } from "@/server/http";
import { getVehicle } from "@/server/services/catalog-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const vehicle = await getVehicle(Number(id));
  if (!vehicle) {
    return notFound("Vehicle", id);
  }
  return json(vehicle, 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
