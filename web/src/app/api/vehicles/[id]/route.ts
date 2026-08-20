export const runtime = "nodejs";

import { json, notFound } from "@/server/http";
import { getVehicle } from "@/server/services/catalog-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const vehicle = await getVehicle(Number(id));
  if (!vehicle) {
    return notFound("Vehicle", id);
  }
  return json(vehicle);
}
