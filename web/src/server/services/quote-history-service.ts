import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { getDb } from "../db/client";
import { quoteHistory } from "../db/schema";
import type { CostBreakdown, Paginated, QuoteHistory } from "@/types";
import { resolveQuoteCalculation } from "./catalog-service";
import { collapseRecentDuplicateQuotes, shouldReuseRecentQuote } from "./quote-history-rules";

export type QuoteSaveRequest = {
  vehicleId: number;
  locationId: number;
  categoryId?: number;
  includeOptionalInsurance?: boolean;
  customerName?: string;
  customerAddress?: string;
  color?: string;
  language?: string;
  usageType?: string;
  selectedOfferIds?: string[];
  forgoneOfferIds?: string[];
  discountAmount?: number;
  deposit?: number;
  optionalBodyInsurance?: number;
  registrationServiceFee?: number;
  micaPlateFee?: number;
  inspectionFee?: number;
  accessories?: { name: string; amount: number }[];
  breakdown?: CostBreakdown;
};

export type QuoteSearchParams = {
  query?: string;
  brandCode?: string;
  locationName?: string;
  page?: number;
  pageSize?: number;
};

const quoteListColumns = {
  id: quoteHistory.id,
  customerName: quoteHistory.customerName,
  customerAddress: quoteHistory.customerAddress,
  vehicleId: quoteHistory.vehicleId,
  brandCode: quoteHistory.brandCode,
  vehicleName: quoteHistory.vehicleName,
  locationId: quoteHistory.locationId,
  locationName: quoteHistory.locationName,
  categoryId: quoteHistory.categoryId,
  color: quoteHistory.color,
  usageType: quoteHistory.usageType,
  language: quoteHistory.language,
  includeOptional: quoteHistory.includeOptional,
  listPrice: quoteHistory.listPrice,
  salePrice: quoteHistory.salePrice,
  discountAmount: quoteHistory.discountAmount,
  deposit: quoteHistory.deposit,
  onRoadTotal: quoteHistory.onRoadTotal,
  createdAt: quoteHistory.createdAt,
};

type QuoteListRow = {
  id: number;
  customerName: string;
  customerAddress: string | null;
  vehicleId: number | null;
  brandCode: string | null;
  vehicleName: string | null;
  locationId: number | null;
  locationName: string | null;
  categoryId: number | null;
  color: string | null;
  usageType: string | null;
  language: string | null;
  includeOptional: boolean;
  listPrice: string | null;
  salePrice: string | null;
  discountAmount: string | null;
  deposit: string | null;
  onRoadTotal: string | null;
  createdAt: Date;
};

function mapQuote(row: typeof quoteHistory.$inferSelect): QuoteHistory {
  return mapQuoteListRow(row);
}

function mapQuoteListRow(row: QuoteListRow | typeof quoteHistory.$inferSelect): QuoteHistory {
  return {
    id: row.id,
    customerName: row.customerName,
    customerAddress: row.customerAddress ?? undefined,
    vehicleId: row.vehicleId ?? 0,
    brandCode: row.brandCode ?? "",
    vehicleName: row.vehicleName ?? "",
    locationId: row.locationId ?? 0,
    locationName: row.locationName ?? "",
    categoryId: row.categoryId ?? undefined,
    color: row.color ?? undefined,
    usageType: (row.usageType as QuoteHistory["usageType"]) ?? undefined,
    language: row.language ?? undefined,
    includeOptional: row.includeOptional,
    listPrice: row.listPrice != null ? Number(row.listPrice) : undefined,
    salePrice: row.salePrice != null ? Number(row.salePrice) : undefined,
    discountAmount: row.discountAmount != null ? Number(row.discountAmount) : undefined,
    deposit: row.deposit != null ? Number(row.deposit) : undefined,
    onRoadTotal: Number(row.onRoadTotal ?? 0),
    payload: "payload" in row ? row.payload ?? undefined : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function quoteSearchWhere(params: QuoteSearchParams): SQL | undefined {
  const filters: SQL[] = [];
  if (params.query?.trim()) {
    const pattern = `%${params.query.trim()}%`;
    filters.push(
      or(
        ilike(quoteHistory.customerName, pattern),
        ilike(quoteHistory.customerAddress, pattern),
        ilike(quoteHistory.vehicleName, pattern),
        ilike(quoteHistory.locationName, pattern),
      )!,
    );
  }
  if (params.brandCode) {
    filters.push(eq(quoteHistory.brandCode, params.brandCode));
  }
  if (params.locationName) {
    filters.push(eq(quoteHistory.locationName, params.locationName));
  }
  return filters.length ? and(...filters) : undefined;
}

export async function searchQuotes(params: QuoteSearchParams = {}): Promise<Paginated<QuoteHistory>> {
  const db = getDb();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 10, 50));
  const offset = (page - 1) * pageSize;
  const where = quoteSearchWhere(params);

  const listQuery = db.select(quoteListColumns).from(quoteHistory);
  const countQuery = db.select({ count: sql<number>`count(*)::int` }).from(quoteHistory);

  const [rows, countRows] = await Promise.all([
    (where ? listQuery.where(where) : listQuery)
      .orderBy(desc(quoteHistory.createdAt))
      .limit(pageSize)
      .offset(offset),
    where ? countQuery.where(where) : countQuery,
  ]);

  return {
    items: collapseRecentDuplicateQuotes(rows.map(mapQuoteListRow)),
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getQuoteFilterOptions() {
  const db = getDb();
  const [brandRows, locationRows] = await Promise.all([
    db
      .selectDistinct({ brandCode: quoteHistory.brandCode })
      .from(quoteHistory)
      .where(sql`${quoteHistory.brandCode} is not null`)
      .orderBy(quoteHistory.brandCode),
    db
      .selectDistinct({ locationName: quoteHistory.locationName })
      .from(quoteHistory)
      .where(sql`${quoteHistory.locationName} is not null`)
      .orderBy(quoteHistory.locationName),
  ]);
  return {
    brandCodes: brandRows.map((row) => row.brandCode).filter((value): value is string => Boolean(value)),
    locationNames: locationRows
      .map((row) => row.locationName)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function getQuote(id: number) {
  const db = getDb();
  const rows = await db.select().from(quoteHistory).where(eq(quoteHistory.id, id)).limit(1);
  return rows[0] ? mapQuote(rows[0]) : null;
}

export async function saveQuote(input: {
  customerName: string;
  customerAddress?: string;
  vehicleId?: number;
  brandCode?: string;
  vehicleName?: string;
  locationId?: number;
  locationName?: string;
  categoryId?: number;
  color?: string;
  usageType?: string;
  language?: string;
  includeOptional?: boolean;
  listPrice?: number;
  salePrice?: number;
  discountAmount?: number;
  deposit?: number;
  onRoadTotal: number;
  payload?: string;
}) {
  const db = getDb();
  const rows = await db
    .insert(quoteHistory)
    .values({
      customerName: input.customerName,
      customerAddress: input.customerAddress,
      vehicleId: input.vehicleId,
      brandCode: input.brandCode,
      vehicleName: input.vehicleName,
      locationId: input.locationId,
      locationName: input.locationName,
      categoryId: input.categoryId,
      color: input.color,
      usageType: input.usageType,
      language: input.language,
      includeOptional: input.includeOptional ?? false,
      listPrice: input.listPrice != null ? String(input.listPrice) : null,
      salePrice: input.salePrice != null ? String(input.salePrice) : null,
      discountAmount: input.discountAmount != null ? String(input.discountAmount) : null,
      deposit: input.deposit != null ? String(input.deposit) : null,
      onRoadTotal: String(input.onRoadTotal),
      payload: input.payload,
      createdAt: new Date(),
    })
    .returning();
  return mapQuote(rows[0]);
}

export async function saveQuoteFromRequest(body: QuoteSaveRequest) {
  const calcResult = await resolveQuoteCalculation(body, body.breakdown);
  if (!calcResult || "error" in calcResult) {
    return null;
  }
  return persistCalculatedQuote(body, calcResult.data, calcResult.vehicleRow.brand.code);
}

export async function persistCalculatedQuote(body: QuoteSaveRequest, calc: CostBreakdown, brandCode: string) {
  const customerName = body.customerName?.trim() || "Khách hàng";
  const recent = await findRecentQuote(customerName, body.vehicleId);
  if (recent && shouldReuseRecentQuote(recent, calc.estimatedOnRoadTotal)) {
    return recent;
  }
  return saveQuote({
    customerName,
    customerAddress: body.customerAddress,
    vehicleId: calc.vehicleId,
    brandCode,
    vehicleName: calc.vehicleName,
    locationId: calc.locationId,
    locationName: calc.locationName,
    categoryId: body.categoryId,
    color: body.color,
    usageType: body.usageType,
    language: body.language,
    includeOptional: body.includeOptionalInsurance ?? false,
    listPrice: calc.listPrice,
    salePrice: calc.salePrice,
    discountAmount: calc.discountAmount,
    deposit: calc.deposit,
    onRoadTotal: calc.estimatedOnRoadTotal,
    payload: JSON.stringify({ calc, request: body }),
  });
}

async function findRecentQuote(customerName: string, vehicleId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(quoteHistory)
    .where(and(eq(quoteHistory.vehicleId, vehicleId), sql`lower(${quoteHistory.customerName}) = lower(${customerName})`))
    .orderBy(desc(quoteHistory.createdAt))
    .limit(1);
  return rows[0] ? mapQuote(rows[0]) : null;
}
