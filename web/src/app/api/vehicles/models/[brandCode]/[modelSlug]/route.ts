export const runtime = "nodejs";

import { json, notFound, CATALOG_LIST_CACHE_CONTROL } from "@/server/http";
import { slugToModel } from "@/lib/modelSlug";
import { getModelDetail } from "@/server/services/catalog-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ brandCode: string; modelSlug: string }> },
) {
  const { brandCode, modelSlug } = await context.params;
  const model = slugToModel(modelSlug);
  const detail = await getModelDetail(brandCode, model);
  if (!detail) {
    return notFound("Model", model);
  }
  return json(detail, 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
