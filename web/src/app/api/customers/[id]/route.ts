export const runtime = "nodejs";

import { error, json, notFound } from "@/server/http";
import { requireOperator } from "@/server/auth/require-operator";
import { deleteCustomer, getCustomer, reactivateCustomer, updateCustomer } from "@/server/services/customer-service";
import type { CustomerInput } from "@/lib/customerValidation";
import { customerApiErrorMessage } from "@/lib/customerApiError";

type RouteContext = { params: Promise<{ id: string }> };

function parseAddress(body: Record<string, unknown>, prefix: "permanent" | "temporary") {
  const nested = body[`${prefix}Address`] as Record<string, unknown> | undefined;
  if (nested) {
    return {
      streetLine: typeof nested.streetLine === "string" ? nested.streetLine : "",
      locationId: nested.locationId != null ? Number(nested.locationId) : undefined,
      districtId: nested.districtId != null ? Number(nested.districtId) : undefined,
    };
  }
  const streetKey = prefix === "permanent" ? "permanentStreetLine" : "temporaryStreetLine";
  const locationKey = prefix === "permanent" ? "permanentLocationId" : "temporaryLocationId";
  const districtKey = prefix === "permanent" ? "permanentDistrictId" : "temporaryDistrictId";
  return {
    streetLine: typeof body[streetKey] === "string" ? body[streetKey] : "",
    locationId: body[locationKey] != null ? Number(body[locationKey]) : undefined,
    districtId: body[districtKey] != null ? Number(body[districtKey]) : undefined,
  };
}

function parseCustomerBody(body: Record<string, unknown>): CustomerInput {
  return {
    fullName: typeof body.fullName === "string" ? body.fullName : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    permanentAddress: parseAddress(body, "permanent"),
    temporaryAddress: parseAddress(body, "temporary"),
    notes: typeof body.notes === "string" ? body.notes : undefined,
    relationships: Array.isArray(body.relationships)
      ? (body.relationships as CustomerInput["relationships"])
      : undefined,
  };
}

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
  return json(customer);
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const id = Number((await context.params).id);
  try {
    const body = await request.json();
    const customer = await updateCustomer(id, parseCustomerBody(body));
    if (!customer) {
      return notFound("Customer", id);
    }
    return json(customer);
  } catch (err) {
    return error(customerApiErrorMessage(err), 422);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const id = Number((await context.params).id);
  const removed = await deleteCustomer(id);
  if (!removed) {
    return notFound("Customer", id);
  }
  return new Response(null, { status: 204 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const id = Number((await context.params).id);
  const body = await request.json().catch(() => ({}));
  if (body?.reactivate === true) {
    const restored = await reactivateCustomer(id);
    if (!restored) {
      return notFound("Customer", id);
    }
    const customer = await getCustomer(id);
    if (!customer) {
      return notFound("Customer", id);
    }
    return json(customer);
  }
  return error("Unsupported patch", 400);
}
