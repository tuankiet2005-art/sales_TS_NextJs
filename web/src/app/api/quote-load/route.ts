export const runtime = "nodejs";

import { json, notFound, error } from "@/server/http";
import { requireOperator } from "@/server/auth/require-operator";
import { loadQuotePageData } from "@/server/services/catalog-service";

export async function POST(request: Request) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const body = await request.json();
  if (!body?.vehicleId || !body?.locationId) {
    return error("vehicleId and locationId are required");
  }
  const result = await loadQuotePageData(body);
  if (!result) {
    return notFound("Vehicle", body.vehicleId);
  }
  if ("error" in result) {
    return notFound(result.error === "location" ? "Location" : "Vehicle category", body.categoryId ?? body.vehicleId);
  }
  return json(result);
}
