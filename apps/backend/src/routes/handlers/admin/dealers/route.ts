export const runtime = "nodejs";

import {json, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { listAdminDealers, upsertDealer } from "@/server/modules/catalog/catalog-admin.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminDealers());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertDealer(await readJsonBody(request)), 201);
}
