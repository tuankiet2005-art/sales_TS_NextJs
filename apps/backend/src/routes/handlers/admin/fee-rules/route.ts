export const runtime = "nodejs";

import {json, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { listAdminFeeRules, upsertFeeRule } from "@/server/modules/catalog/catalog-admin.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminFeeRules());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertFeeRule(await readJsonBody(request)), 201);
}
