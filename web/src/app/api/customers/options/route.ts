export const runtime = "nodejs";

import { json } from "@/server/http";
import { requireOperator } from "@/server/auth/require-operator";
import { listCustomerOptions } from "@/server/services/customer-service";

export async function GET(request: Request) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const excludeId = new URL(request.url).searchParams.get("exclude");
  return json(await listCustomerOptions(excludeId ? Number(excludeId) : undefined));
}
