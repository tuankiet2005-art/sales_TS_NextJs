export const runtime = "nodejs";

import { json } from "@/server/http";
import { getBrands } from "@/server/services/catalog-service";

export async function GET() {
  return json(await getBrands());
}
