export const runtime = "nodejs";

import {json, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { readPlateRegions, savePlateRegions } from "@/server/modules/policy/policy-admin.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await readPlateRegions());
}

export async function PUT(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await savePlateRegions(await readJsonBody(request)));
}
