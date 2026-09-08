export const runtime = "nodejs";

import { json } from "@/server/shared/http";
import { requireOperator } from "@/server/modules/auth/require-operator";
import { getBankLoan } from "@/server/modules/bank-loan/bank-loan.service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireOperator(request);
  if (denied) return denied;
  const { id } = await context.params;
  const loan = await getBankLoan(Number(id));
  if (!loan) {
    return json({ message: "Not found" }, 404);
  }
  return json(loan);
}
