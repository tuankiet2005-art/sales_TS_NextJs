export const runtime = "nodejs";

import { json } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { listAdminBankLoans, upsertBankLoan } from "@/server/services/bank-loan-service";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await listAdminBankLoans());
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return json(await upsertBankLoan(await request.json()), 201);
}
