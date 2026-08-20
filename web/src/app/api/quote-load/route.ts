export const runtime = "nodejs";

import { json, notFound, error } from "@/server/http";
import { loadQuotePageData } from "@/server/services/catalog-service";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.vehicleId || !body?.locationId) {
    return error("vehicleId and locationId are required");
  }
  const result = await loadQuotePageData(body);
  if (!result) {
    return notFound("Vehicle", body.vehicleId);
  }
  if ("error" in result) {
    return notFound(result.error === "location" ? "Location" : "Vehicle category", body.locationId);
  }
  return json(result);
}
