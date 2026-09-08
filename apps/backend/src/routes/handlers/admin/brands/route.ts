export const runtime = "nodejs";

import {json, noContent, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import {
  deleteBrand,
  listAdminBrands,
  upsertBrand,
} from "@/server/modules/catalog/catalog-admin.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminBrands());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertBrand(await readJsonBody(request)), 201);
}
