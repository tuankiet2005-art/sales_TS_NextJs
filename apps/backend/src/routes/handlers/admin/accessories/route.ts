export const runtime = "nodejs";

import {json, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { listAdminAccessories, upsertAccessory } from "@/server/modules/accessory/accessory.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminAccessories());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertAccessory(await readJsonBody(request)), 201);
}
