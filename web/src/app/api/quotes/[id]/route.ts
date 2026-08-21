export const runtime = "nodejs";

import { json, notFound } from "@/server/http";
import { requireOperator } from "@/server/auth/require-operator";
import { getQuote } from "@/server/services/quote-history-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const { id } = await context.params;
  const quote = await getQuote(Number(id));
  if (!quote) {
    return notFound("Quote", id);
  }
  return json(quote);
}
