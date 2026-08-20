export const runtime = "nodejs";

import { json } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { listAdminCategories, upsertCategory } from "@/server/services/catalog-admin-service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminCategories());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertCategory(await request.json()), 201);
}
