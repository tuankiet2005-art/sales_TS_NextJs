export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { json } from "@/server/http";
import { getQuote, saveQuote, searchQuotes } from "@/server/services/quote-history-service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  return json(await searchQuotes(query));
}

export async function POST(request: Request) {
  const body = await request.json();
  const quote = await saveQuote({
    customerName: body.customerName ?? "Khách hàng",
    customerAddress: body.customerAddress,
    vehicleId: body.vehicleId,
    brandCode: body.brandCode,
    vehicleName: body.vehicleName,
    locationId: body.locationId,
    locationName: body.locationName,
    categoryId: body.categoryId,
    color: body.color,
    usageType: body.usageType,
    language: body.language,
    includeOptional: body.includeOptionalInsurance ?? false,
    listPrice: body.listPrice,
    salePrice: body.salePrice,
    discountAmount: body.discountAmount,
    deposit: body.deposit,
    onRoadTotal: body.onRoadTotal ?? body.estimatedOnRoadTotal ?? 0,
    payload: body.payload,
  });
  return json(quote);
}
