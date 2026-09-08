export const runtime = "nodejs";

import {json, notFound, error, readJsonBody} from "@/server/shared/http";
import { requireOperator } from "@/server/modules/auth/require-operator";
import { loadQuotePageData } from "@/server/modules/catalog/catalog.service";

export async function POST(request: Request) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const body = await readJsonBody(request);
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
