export const runtime = "nodejs";

import { json } from "@/server/http";
import { getHealth } from "@/server/services/catalog-service";

export async function GET() {
  return json(await getHealth());
}
