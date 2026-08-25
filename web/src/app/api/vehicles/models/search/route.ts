export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { json, CATALOG_LIST_CACHE_CONTROL } from "@/server/http";
import { searchModelsPage } from "@/server/services/catalog-service";

function readSearchParams(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return {
    keyword: params.get("keyword") ?? undefined,
    brandCode: params.get("brand") ?? undefined,
    categoryId: params.get("categoryId") ? Number(params.get("categoryId")) : undefined,
    model: params.get("model") ?? undefined,
    vehicleType: params.get("type") ?? undefined,
    page: params.get("page") ? Number(params.get("page")) : 1,
    pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : 12,
  };
}

export async function GET(request: NextRequest) {
  const { keyword, brandCode, categoryId, model, vehicleType, page, pageSize } = readSearchParams(request);
  return json(
    await searchModelsPage({
      keyword,
      brandCode,
      categoryId,
      model,
      vehicleType,
      page,
      pageSize,
    }),
    200,
    { "Cache-Control": CATALOG_LIST_CACHE_CONTROL },
  );
}
