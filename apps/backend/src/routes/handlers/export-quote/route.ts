export const runtime = "nodejs";

import {error, notFound, readJsonBody} from "@/server/shared/http";
import { requireOperator } from "@/server/modules/auth/require-operator";
import { exportQuote } from "@/server/modules/quote/quote-export.service";

export async function POST(request: Request) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const body = await readJsonBody(request);
  if (!body?.vehicleId || !body?.locationId) {
    return error("vehicleId and locationId are required");
  }
  const result = await exportQuote(body);
  if (!result) {
    return notFound("Vehicle", body.vehicleId);
  }
  return new Response(result.buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
