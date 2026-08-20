export const runtime = "nodejs";

import { json } from "@/server/http";
import { getDealerPolicyResponse } from "@/server/services/catalog-service";

export async function GET() {
  return json(await getDealerPolicyResponse());
}
