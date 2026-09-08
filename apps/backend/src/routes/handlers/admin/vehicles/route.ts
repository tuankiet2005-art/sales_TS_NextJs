export const runtime = "nodejs";

import {json, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { listAdminVehicles, upsertVehicle } from "@/server/modules/catalog/catalog-admin.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminVehicles());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertVehicle(await readJsonBody(request)), 201);
}
