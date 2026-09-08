export const runtime = "nodejs";

import {json, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { listAdminConsultingEmployees, upsertConsultingEmployee } from "@/server/modules/bank-loan/bank-loan.service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminConsultingEmployees());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertConsultingEmployee(await readJsonBody(request)), 201);
}
