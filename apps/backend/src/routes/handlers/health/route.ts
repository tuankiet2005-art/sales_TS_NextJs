export const runtime = "nodejs";

import { json } from "@/server/shared/http";
import { getHealth } from "@/server/modules/catalog/catalog.service";

export async function GET() {
  return json(await getHealth());
}
