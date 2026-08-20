import { and, eq, ilike, or, sql, type SQL } from "drizzle-orm";

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

export type ActiveVehicleSearchParams = {
  keyword?: string;
  brandCode?: string;
  categoryId?: number;
  model?: string;
  vehicleType?: string;
  limit?: number;
  offset?: number;
};

function activeVehicleSearchWhere(params: ActiveVehicleSearchParams): SQL {
  const filters: SQL[] = [eq(vehicles.active, true)];

  if (params.brandCode) {
    filters.push(sql`lower(${brands.code}) = lower(${params.brandCode})`);
  }
  if (params.categoryId) {
    filters.push(eq(vehicles.categoryId, params.categoryId));
  }
  if (params.model) {
    filters.push(eq(vehicles.model, params.model));
  }
  if (params.vehicleType) {
    filters.push(eq(vehicles.vehicleType, params.vehicleType));
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

  return and(...filters)!;
}

function activeVehicleSearchBase(params: ActiveVehicleSearchParams) {
  const db = getDb();
  return db
    .select({
      vehicle: {
        id: vehicles.id,
        model: vehicles.model,
        name: vehicles.name,
        seats: vehicles.seats,
        vehicleType: vehicles.vehicleType,
        modelYear: vehicles.modelYear,
        listPrice: vehicles.listPrice,
        imageUrl: vehicles.imageUrl,
      },
      brand: {
        name: brands.name,
        code: brands.code,
      },
      category: vehicleCategories,
    })
    .from(vehicles)
    .innerJoin(brands, eq(vehicles.brandId, brands.id))
    .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
    .where(activeVehicleSearchWhere(params))
    .orderBy(vehicles.name);
}

export async function searchActiveVehicles(params: ActiveVehicleSearchParams) {
  const query = activeVehicleSearchBase(params);
  if (params.limit == null) {
    return query;
  }
  return query.limit(params.limit).offset(params.offset ?? 0);
}

export async function countActiveVehicles(params: ActiveVehicleSearchParams) {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vehicles)
    .innerJoin(brands, eq(vehicles.brandId, brands.id))
    .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
    .where(activeVehicleSearchWhere(params));
  return rows[0]?.count ?? 0;
}

export async function listActiveVehicleFilterOptions(brandCode?: string) {
  const db = getDb();
  const params: ActiveVehicleSearchParams = brandCode ? { brandCode } : {};
  const where = activeVehicleSearchWhere(params);

  const [modelRows, typeRows] = await Promise.all([
    db
      .selectDistinct({ model: vehicles.model })
      .from(vehicles)
      .innerJoin(brands, eq(vehicles.brandId, brands.id))
      .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
      .where(where)
      .orderBy(vehicles.model),
    db
      .selectDistinct({ vehicleType: vehicles.vehicleType })
      .from(vehicles)
      .innerJoin(brands, eq(vehicles.brandId, brands.id))
      .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
      .where(where)
      .orderBy(vehicles.vehicleType),
  ]);

  return {
    models: modelRows.map((row: { model: string }) => row.model).filter(Boolean),
    vehicleTypes: typeRows
      .map((row: { vehicleType: string | null }) => row.vehicleType)
      .filter((value): value is string => Boolean(value)),
  };
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
