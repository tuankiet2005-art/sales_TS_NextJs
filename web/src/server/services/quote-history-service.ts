import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "../db/client";
import { findActiveVehicleById } from "../db/repositories/catalog";
import { quoteHistory } from "../db/schema";
import type { CostBreakdown, QuoteHistory } from "@/types";
import { calculateOnRoad } from "./catalog-service";
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
};

function mapQuote(row: typeof quoteHistory.$inferSelect): QuoteHistory {
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
    onRoadTotal: Number(row.onRoadTotal),
    payload: row.payload ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function searchQuotes(query?: string) {
  const db = getDb();
  if (query?.trim()) {
    const pattern = `%${query.trim()}%`;
    const rows = await db
      .select()
      .from(quoteHistory)
      .where(
        or(
          ilike(quoteHistory.customerName, pattern),
          ilike(quoteHistory.vehicleName, pattern),
          ilike(quoteHistory.locationName, pattern),
        ),
      )
      .orderBy(desc(quoteHistory.createdAt))
      .limit(100);
    return collapseRecentDuplicateQuotes(rows.map(mapQuote));
  }
  const rows = await db
    .select()
    .from(quoteHistory)
    .orderBy(desc(quoteHistory.createdAt))
    .limit(100);
  return collapseRecentDuplicateQuotes(rows.map(mapQuote));
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
  const calcResult = await calculateOnRoad(body);
  if (!calcResult || "error" in calcResult) {
    return null;
  }
  const vehicleRow = await findActiveVehicleById(body.vehicleId);
  if (!vehicleRow) {
    return null;
  }
  return persistCalculatedQuote(body, calcResult.data, vehicleRow.brand.code);
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
