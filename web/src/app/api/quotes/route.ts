export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { error, json, notFound } from "@/server/http";
import { saveQuoteFromRequest, searchQuotes } from "@/server/services/quote-history-service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  return json(await searchQuotes(query));
}

export async function POST(request: Request) {
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
