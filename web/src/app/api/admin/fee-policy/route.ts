export const runtime = "nodejs";

import { json } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { readFeePolicy, saveFeePolicy } from "@/server/services/policy-admin-service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await readFeePolicy());
}

export async function PUT(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await saveFeePolicy(await request.json()));
}
