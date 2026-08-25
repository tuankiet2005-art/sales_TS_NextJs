export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { error, json } from "@/server/http";
import { requireOperator } from "@/server/auth/require-operator";
import { createCustomer, searchCustomers } from "@/server/services/customer-service";
import type { CustomerInput } from "@/lib/customerValidation";
import { customerApiErrorMessage } from "@/lib/customerApiError";

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

export async function GET(request: NextRequest) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  const params = request.nextUrl.searchParams;
  const query = params.get("q") ?? undefined;
  const page = params.get("page") ? Number(params.get("page")) : 1;
  const pageSize = params.get("pageSize") ? Number(params.get("pageSize")) : 20;
  const includeInactive = params.get("includeInactive") === "1";
  return json(await searchCustomers({ query, page, pageSize, includeInactive }));
}

export async function POST(request: Request) {
  const denied = requireOperator(request);
  if (denied) {
    return denied;
  }
  try {
    const body = await request.json();
    return json(await createCustomer(parseCustomerBody(body)), 201);
  } catch (err) {
    return error(customerApiErrorMessage(err), 422);
  }
}
