export const runtime = "nodejs";

import { json } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { importAll } from "@/server/services/catalog-admin-service";

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await importAll(await request.json()));
}
