export const runtime = "nodejs";

import { json, noContent } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import {
  deleteBrand,
  listAdminBrands,
  upsertBrand,
} from "@/server/services/catalog-admin-service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminBrands());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertBrand(await request.json()), 201);
}
