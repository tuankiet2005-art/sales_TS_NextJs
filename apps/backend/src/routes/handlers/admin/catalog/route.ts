export const runtime = "nodejs";

import { json } from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { exportAll, importAll } from "@/server/modules/catalog/catalog-admin.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await exportAll());
}
