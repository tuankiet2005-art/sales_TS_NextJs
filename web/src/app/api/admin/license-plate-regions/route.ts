export const runtime = "nodejs";

import { json } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { readPlateRegions, savePlateRegions } from "@/server/services/policy-admin-service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await readPlateRegions());
}

export async function PUT(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await savePlateRegions(await request.json()));
}
