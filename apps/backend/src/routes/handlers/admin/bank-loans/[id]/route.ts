export const runtime = "nodejs";

import {json, noContent, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { deleteBankLoan, getBankLoan, upsertBankLoan } from "@/server/modules/bank-loan/bank-loan.service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  const loan = await getBankLoan(Number(id));
  if (!loan) {
    return json({ message: "Not found" }, 404);
  }
  return json(loan);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  return json(await upsertBankLoan({ ...(await readJsonBody(request)), id: Number(id) }));
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  await deleteBankLoan(Number(id));
  return noContent();
}
