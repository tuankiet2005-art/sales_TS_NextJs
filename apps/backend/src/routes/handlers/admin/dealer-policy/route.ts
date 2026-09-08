export const runtime = "nodejs";

import {json, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { readDealerPolicy, saveDealerPolicy } from "@/server/modules/policy/policy-admin.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await readDealerPolicy());
}

export async function PUT(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await saveDealerPolicy(await readJsonBody(request)));
}
