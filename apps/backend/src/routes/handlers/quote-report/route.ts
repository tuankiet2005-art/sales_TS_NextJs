export const runtime = "nodejs";

import {json, notFound, error, readJsonBody} from "@/server/shared/http";
import { requireOperator } from "@/server/modules/auth/require-operator";
import { buildQuoteReportView } from "@/server/modules/quote/quote-report.service";

export async function POST(request: Request) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const body = await readJsonBody(request);
  if (!body?.vehicleId || !body?.locationId) {
    return error("vehicleId and locationId are required");
  }
  const view = await buildQuoteReportView(body);
  if (!view) {
    return notFound("Vehicle", body.vehicleId);
  }
  return json(view);
}
