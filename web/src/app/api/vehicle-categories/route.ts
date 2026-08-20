export const runtime = "nodejs";

import { json } from "@/server/http";
import { getCategories } from "@/server/services/catalog-service";

export async function GET() {
  return json(await getCategories());
}
