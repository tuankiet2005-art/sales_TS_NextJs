export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { json } from "@/server/http";
import { searchVehicles } from "@/server/services/catalog-service";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keyword = params.get("keyword") ?? undefined;
  const brand = params.get("brand") ?? undefined;
  const categoryId = params.get("categoryId") ? Number(params.get("categoryId")) : undefined;
  return json(await searchVehicles({ keyword, brandCode: brand, categoryId }));
}
