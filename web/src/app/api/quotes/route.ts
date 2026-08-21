export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { error, json, notFound } from "@/server/http";
import { requireOperator } from "@/server/auth/require-operator";
import {
  getQuoteFilterOptions,
  saveQuoteFromRequest,
  searchQuotes,
} from "@/server/services/quote-history-service";

export async function GET(request: NextRequest) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const params = request.nextUrl.searchParams;
  if (params.get("filters") === "1") {
    return json(await getQuoteFilterOptions());
  }
  const query = params.get("q") ?? undefined;
  const brandCode = params.get("brand") ?? undefined;
  const locationName = params.get("location") ?? undefined;
  const page = params.get("page") ? Number(params.get("page")) : 1;
  const pageSize = params.get("pageSize") ? Number(params.get("pageSize")) : 10;
  return json(
    await searchQuotes({
      query,
      brandCode,
      locationName,
      page,
      pageSize,
    }),
  );
}

export async function POST(request: Request) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const body = await request.json();
  if (!body?.vehicleId || !body?.locationId) {
    return error("vehicleId and locationId are required");
  }
  const quote = await saveQuoteFromRequest(body);
  if (!quote) {
    return notFound("Vehicle", body.vehicleId);
  }
  return json(quote);
}
