export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { error, notFound } from "@/server/http";
import { requireOperator } from "@/server/auth/require-operator";
import { exportQuote } from "@/server/services/quote-export-service";

export async function POST(request: Request) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const body = await request.json();
  if (!body?.vehicleId || !body?.locationId) {
    return error("vehicleId and locationId are required");
  }
  const result = await exportQuote(body);
  if (!result) {
    return notFound("Vehicle", body.vehicleId);
  }
  return new NextResponse(result.buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
