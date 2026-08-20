export const runtime = "nodejs";

import { json } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { listAdminFeeDefinitions, upsertFeeDefinition } from "@/server/services/catalog-admin-service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminFeeDefinitions());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertFeeDefinition(await request.json()), 201);
}
