export const runtime = "nodejs";

import { json, CATALOG_LIST_CACHE_CONTROL } from "@/server/shared/http";
import { listActiveBanks } from "@/server/modules/bank-loan/bank-loan.service";

export async function GET() {
  return json(await listActiveBanks(), 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
}
