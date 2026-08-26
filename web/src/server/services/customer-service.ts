import { and, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";

import type {
  Customer,
  CustomerDetail,
  CustomerPurchase,
  CustomerRelationship,
  CustomerRelationshipInput,
  Paginated,
  StructuredAddress,
} from "@/types";
import { validateCustomerInput, type CustomerInput } from "@/lib/customerValidation";
import { getDb } from "../db/client";
import { customerRelationships, customers, quoteHistory } from "../db/schema";

function mapStructuredAddress(
  streetLine: string | null,
  locationId: number | null,
  districtId: number | null,
  legacy?: { streetLine?: string | null; locationId?: number | null; districtId?: number | null },
): StructuredAddress {
  return {
    streetLine: streetLine?.trim() || legacy?.streetLine?.trim() || "",
    locationId: locationId ?? legacy?.locationId ?? undefined,
    districtId: districtId ?? legacy?.districtId ?? undefined,
  };
}

function mapCustomer(row: typeof customers.$inferSelect): Customer {
  const legacy = {
    streetLine: row.streetLine,
    locationId: row.locationId,
    districtId: row.districtId,
  };
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone ?? undefined,
    permanentAddress: mapStructuredAddress(
      row.permanentStreetLine,
      row.permanentLocationId,
      row.permanentDistrictId,
      legacy,
    ),
    temporaryAddress: mapStructuredAddress(
      row.temporaryStreetLine,
      row.temporaryLocationId,
      row.temporaryDistrictId,
    ),
    notes: row.notes ?? undefined,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPurchase(row: {
  id: number;
  vehicleName: string | null;
  brandCode: string | null;
  onRoadTotal: string | null;
  createdAt: Date;
}): CustomerPurchase {
  return {
    id: row.id,
    vehicleName: row.vehicleName ?? "",
    brandCode: row.brandCode ?? "",
    onRoadTotal: Number(row.onRoadTotal ?? 0),
    createdAt: row.createdAt.toISOString(),
  };
}

function customerSearchWhere(query?: string): SQL | undefined {
  const trimmed = query?.trim();
  if (!trimmed) {
    return undefined;
  }
  const pattern = `%${trimmed}%`;
  return or(ilike(customers.fullName, pattern), ilike(customers.phone, pattern));
}

function customerListWhere(options: { query?: string; includeInactive?: boolean }): SQL | undefined {
  const filters: SQL[] = [];
  if (!options.includeInactive) {
    filters.push(eq(customers.isActive, true));
  }
  const search = customerSearchWhere(options.query);
  if (search) {
    filters.push(search);
  }
  return filters.length ? and(...filters) : undefined;
}

export async function searchCustomers(options: {
  query?: string;
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
}): Promise<Paginated<Customer>> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
  const where = customerListWhere(options);
  const base = db.select().from(customers);
  const rows = await (where ? base.where(where) : base)
    .orderBy(customers.fullName)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const countQuery = db.select({ count: sql<number>`count(*)::int` }).from(customers);
  const [{ count }] = where ? await countQuery.where(where) : await countQuery;
  return {
    items: rows.map(mapCustomer),
    total: count,
    page,
    pageSize,
  };
}

async function loadRelationships(customerId: number): Promise<CustomerRelationship[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: customerRelationships.id,
      relationshipType: customerRelationships.relationshipType,
      note: customerRelationships.note,
      relatedCustomerId: customers.id,
      relatedFullName: customers.fullName,
      relatedPhone: customers.phone,
    })
    .from(customerRelationships)
    .innerJoin(customers, eq(customerRelationships.relatedCustomerId, customers.id))
    .where(eq(customerRelationships.customerId, customerId))
    .orderBy(customers.fullName);
  return rows.map((row) => ({
    id: row.id,
    relationshipType: row.relationshipType as CustomerRelationship["relationshipType"],
    note: row.note ?? undefined,
    relatedCustomer: {
      id: row.relatedCustomerId,
      fullName: row.relatedFullName,
      phone: row.relatedPhone ?? undefined,
    },
  }));
}

async function loadPurchaseHistory(customerId: number): Promise<CustomerPurchase[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: quoteHistory.id,
      vehicleName: quoteHistory.vehicleName,
      brandCode: quoteHistory.brandCode,
      onRoadTotal: quoteHistory.onRoadTotal,
      createdAt: quoteHistory.createdAt,
    })
    .from(quoteHistory)
    .where(eq(quoteHistory.customerId, customerId))
    .orderBy(desc(quoteHistory.createdAt))
    .limit(50);
  return rows.map(mapPurchase);
}

export async function getCustomer(id: number): Promise<CustomerDetail | null> {
  const db = getDb();
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!rows[0]) {
    return null;
  }
  const customer = mapCustomer(rows[0]);
  return {
    ...customer,
    relationships: await loadRelationships(id),
    purchases: await loadPurchaseHistory(id),
  };
}

function assertValidCustomer(input: CustomerInput) {
  const errors = validateCustomerInput(input);
  const first = Object.values(errors)[0];
  if (first) {
    throw new Error(`Invalid customer: ${Object.keys(errors).join(", ")}`);
  }
}

async function replaceRelationships(customerId: number, relationships: CustomerRelationshipInput[] = []) {
  const db = getDb();
  await db.delete(customerRelationships).where(eq(customerRelationships.customerId, customerId));
  const valid = relationships.filter(
    (item) => item.relatedCustomerId && item.relationshipType && item.relatedCustomerId !== customerId,
  );
  if (valid.length === 0) {
    return;
  }
  await db.insert(customerRelationships).values(
    valid.map((item) => ({
      customerId,
      relatedCustomerId: item.relatedCustomerId!,
      relationshipType: item.relationshipType!,
      note: item.note?.trim() || null,
    })),
  );
}

function addressValues(address?: StructuredAddress) {
  return {
    streetLine: address?.streetLine?.trim() || null,
    locationId: address?.locationId ?? null,
    districtId: address?.districtId ?? null,
  };
}

function customerValues(input: CustomerInput) {
  const permanent = addressValues(input.permanentAddress);
  const temporary = addressValues(input.temporaryAddress);
  return {
    fullName: input.fullName!.trim(),
    phone: input.phone?.trim() || null,
    permanentStreetLine: permanent.streetLine,
    permanentLocationId: permanent.locationId,
    permanentDistrictId: permanent.districtId,
    temporaryStreetLine: temporary.streetLine,
    temporaryLocationId: temporary.locationId,
    temporaryDistrictId: temporary.districtId,
    streetLine: permanent.streetLine,
    locationId: permanent.locationId,
    districtId: permanent.districtId,
    notes: input.notes?.trim() || null,
    updatedAt: new Date(),
  };
}

export async function createCustomer(input: CustomerInput): Promise<CustomerDetail> {
  assertValidCustomer(input);
  const db = getDb();
  const rows = await db
    .insert(customers)
    .values({
      ...customerValues(input),
      createdAt: new Date(),
    })
    .returning();
  const customer = mapCustomer(rows[0]);
  await replaceRelationships(customer.id, input.relationships);
  return {
    ...customer,
    relationships: await loadRelationships(customer.id),
    purchases: [],
  };
}

export async function updateCustomer(id: number, input: CustomerInput): Promise<CustomerDetail | null> {
  assertValidCustomer(input);
  const db = getDb();
  const rows = await db.update(customers).set(customerValues(input)).where(eq(customers.id, id)).returning();
  if (!rows[0]) {
    return null;
  }
  await replaceRelationships(id, input.relationships);
  return getCustomer(id);
}

export async function deleteCustomer(id: number): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .update(customers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.isActive, true)))
    .returning({ id: customers.id });
  return rows.length > 0;
}

export async function reactivateCustomer(id: number): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .update(customers)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.isActive, false)))
    .returning({ id: customers.id });
  return rows.length > 0;
}

export async function listCustomerOptions(excludeId?: number): Promise<Customer[]> {
  const db = getDb();
  const filters = [eq(customers.isActive, true)];
  if (excludeId) {
    filters.push(ne(customers.id, excludeId));
  }
  const rows = await db
    .select()
    .from(customers)
    .where(and(...filters))
    .orderBy(customers.fullName)
    .limit(500);
  return rows.map(mapCustomer);
}
