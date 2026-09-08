export const runtime = "nodejs";

import { json, notFound } from "@/server/shared/http";
import { requireOperator } from "@/server/modules/auth/require-operator";
import { resolveCustomerRelationshipDiscount } from "@/server/modules/customer/customer-relationship-discount.service";
import { getCustomer } from "@/server/modules/customer/customer.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const id = Number((await context.params).id);
  const customer = await getCustomer(id);
  if (!customer) {
    return notFound("Customer", id);
  }
  const params = new URL(request.url).searchParams;
  const listPrice = Number(params.get("listPrice"));
  if (!listPrice || listPrice <= 0) {
    return json({ offer: null });
  }
  const offer = await resolveCustomerRelationshipDiscount(id, listPrice);
  return json({ offer });
}
