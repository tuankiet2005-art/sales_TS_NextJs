import { and, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "../client";
import {
  brands,
  feeDefinitions,
  feeRules,
  locations,
  vehicleCategories,
  vehicles,
} from "../schema";

export async function findActiveVehicleById(id: number) {
  const db = getDb();
  const rows = await db
    .select({
      vehicle: vehicles,
      brand: brands,
      category: vehicleCategories,
    })
    .from(vehicles)
    .innerJoin(brands, eq(vehicles.brandId, brands.id))
    .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
    .where(and(eq(vehicles.id, id), eq(vehicles.active, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function searchActiveVehicles(params: {
  keyword?: string;
  brandCode?: string;
  categoryId?: number;
}) {
  const db = getDb();
  const filters = [eq(vehicles.active, true)];

  if (params.brandCode) {
    filters.push(sql`lower(${brands.code}) = lower(${params.brandCode})`);
  }
  if (params.categoryId) {
    filters.push(eq(vehicles.categoryId, params.categoryId));
  }
  if (params.keyword?.trim()) {
    const pattern = `%${params.keyword.trim()}%`;
    filters.push(
      or(
        ilike(vehicles.name, pattern),
        ilike(brands.name, pattern),
        ilike(vehicles.model, pattern),
        ilike(vehicleCategories.name, pattern),
      )!,
    );
  }

  return db
    .select({
      vehicle: vehicles,
      brand: brands,
      category: vehicleCategories,
    })
    .from(vehicles)
    .innerJoin(brands, eq(vehicles.brandId, brands.id))
    .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
    .where(and(...filters))
    .orderBy(vehicles.name);
}

export async function listBrands() {
  const db = getDb();
  return db.select().from(brands).orderBy(brands.sortOrder, brands.name);
}

export async function findBrandByCode(code: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(brands)
    .where(sql`lower(${brands.code}) = lower(${code})`)
    .limit(1);
  return rows[0] ?? null;
}

export async function listCategories() {
  const db = getDb();
  return db.select().from(vehicleCategories).orderBy(vehicleCategories.sortOrder, vehicleCategories.name);
}

export async function findCategoryById(id: number) {
  const db = getDb();
  const rows = await db.select().from(vehicleCategories).where(eq(vehicleCategories.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listLocations() {
  const db = getDb();
  return db.select().from(locations).orderBy(locations.name);
}

export async function findLocationById(id: number) {
  const db = getDb();
  const rows = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function countBrands() {
  const db = getDb();
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(brands);
  return rows[0]?.count ?? 0;
}

export async function listActiveFeeDefinitions() {
  const db = getDb();
  return db
    .select()
    .from(feeDefinitions)
    .where(eq(feeDefinitions.active, true))
    .orderBy(feeDefinitions.sortOrder);
}

export async function listActiveFeeRules() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(feeRules)
    .where(
      and(
        eq(feeRules.active, true),
        or(sql`${feeRules.effectiveFrom} is null`, sql`${feeRules.effectiveFrom} <= ${today}`),
        or(sql`${feeRules.effectiveTo} is null`, sql`${feeRules.effectiveTo} >= ${today}`),
      ),
    );
}
