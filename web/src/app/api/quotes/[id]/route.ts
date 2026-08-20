export const runtime = "nodejs";

import { json, notFound } from "@/server/http";
import { getQuote } from "@/server/services/quote-history-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const quote = await getQuote(Number(id));
  if (!quote) {
    return notFound("Quote", id);
  }
  return json(quote);
}
