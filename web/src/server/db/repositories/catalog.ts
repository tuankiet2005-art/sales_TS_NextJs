import { and, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { getDb } from "../client";
import {
  brands,
  feeDefinitions,
  feeRules,
  locationDistricts,
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

export type ActiveModelSummaryRow = {
  brandId: number;
  brandCode: string;
  brandName: string;
  model: string;
  yearMin: number | null;
  yearMax: number | null;
  minListPrice: string;
  trimCount: number;
  repVehicleId: number;
  repImageUrl: string | null;
  category: typeof vehicleCategories.$inferSelect;
};

function activeModelSearchSql(params: ActiveVehicleSearchParams, limit?: number, offset?: number) {
  const where = activeVehicleSearchWhere(params);
  const limitSql = limit != null ? sql`LIMIT ${limit}` : sql``;
  const offsetSql = offset != null ? sql`OFFSET ${offset}` : sql``;
  return sql`
    WITH filtered AS (
      SELECT
        ${vehicles.id} AS vehicle_id,
        ${vehicles.brandId} AS brand_id,
        ${vehicles.model} AS model,
        ${vehicles.modelYear} AS model_year,
        ${vehicles.listPrice} AS list_price,
        ${vehicles.imageUrl} AS image_url,
        ${brands.code} AS brand_code,
        ${brands.name} AS brand_name,
        ${vehicleCategories.id} AS category_id,
        ${vehicleCategories.code} AS category_code,
        ${vehicleCategories.name} AS category_name,
        ${vehicleCategories.description} AS category_description,
        ${vehicleCategories.typicalSeats} AS category_typical_seats,
        ${vehicleCategories.requiresInspection} AS category_requires_inspection,
        ${vehicleCategories.requiresRoadUseFee} AS category_requires_road_use_fee,
        ${vehicleCategories.requiresCompulsoryInsurance} AS category_requires_compulsory_insurance,
        ${vehicleCategories.sortOrder} AS category_sort_order
      FROM ${vehicles}
      INNER JOIN ${brands} ON ${eq(vehicles.brandId, brands.id)}
      INNER JOIN ${vehicleCategories} ON ${eq(vehicles.categoryId, vehicleCategories.id)}
      WHERE ${where}
    ),
    grouped AS (
      SELECT
        brand_id,
        model,
        min(model_year) AS year_min,
        max(model_year) AS year_max,
        min(list_price) AS min_list_price,
        count(*)::int AS trim_count
      FROM filtered
      GROUP BY brand_id, model
    ),
    reps AS (
      SELECT DISTINCT ON (brand_id, model)
        filtered.*
      FROM filtered
      ORDER BY brand_id, model, model_year DESC NULLS LAST, list_price ASC, vehicle_id ASC
    )
    SELECT
      reps.brand_id AS "brandId",
      reps.brand_code AS "brandCode",
      reps.brand_name AS "brandName",
      reps.model AS model,
      grouped.year_min AS "yearMin",
      grouped.year_max AS "yearMax",
      grouped.min_list_price::text AS "minListPrice",
      grouped.trim_count AS "trimCount",
      reps.vehicle_id AS "repVehicleId",
      reps.image_url AS "repImageUrl",
      reps.category_id AS "categoryId",
      reps.category_code AS "categoryCode",
      reps.category_name AS "categoryName",
      reps.category_description AS "categoryDescription",
      reps.category_typical_seats AS "categoryTypicalSeats",
      reps.category_requires_inspection AS "categoryRequiresInspection",
      reps.category_requires_road_use_fee AS "categoryRequiresRoadUseFee",
      reps.category_requires_compulsory_insurance AS "categoryRequiresCompulsoryInsurance",
      reps.category_sort_order AS "categorySortOrder"
    FROM grouped
    INNER JOIN reps ON grouped.brand_id = reps.brand_id AND grouped.model = reps.model
    ORDER BY reps.model
    ${limitSql}
    ${offsetSql}
  `;
}

function mapModelSummaryRow(row: Record<string, unknown>): ActiveModelSummaryRow {
  return {
    brandId: Number(row.brandId),
    brandCode: String(row.brandCode),
    brandName: String(row.brandName),
    model: String(row.model),
    yearMin: row.yearMin != null ? Number(row.yearMin) : null,
    yearMax: row.yearMax != null ? Number(row.yearMax) : null,
    minListPrice: String(row.minListPrice),
    trimCount: Number(row.trimCount ?? 1),
    repVehicleId: Number(row.repVehicleId),
    repImageUrl: row.repImageUrl != null ? String(row.repImageUrl) : null,
    category: {
      id: Number(row.categoryId),
      code: String(row.categoryCode),
      name: String(row.categoryName),
      description: row.categoryDescription != null ? String(row.categoryDescription) : null,
      typicalSeats: row.categoryTypicalSeats != null ? Number(row.categoryTypicalSeats) : null,
      requiresInspection: Boolean(row.categoryRequiresInspection),
      requiresRoadUseFee: Boolean(row.categoryRequiresRoadUseFee),
      requiresCompulsoryInsurance: Boolean(row.categoryRequiresCompulsoryInsurance),
      sortOrder: Number(row.categorySortOrder ?? 0),
    },
  };
}

export async function searchActiveModelSummaries(params: ActiveVehicleSearchParams) {
  const db = getDb();
  const rows = await db.execute(activeModelSearchSql(params, params.limit, params.offset));
  return rows.rows.map((row) => mapModelSummaryRow(row as Record<string, unknown>));
}

export async function countActiveModels(params: ActiveVehicleSearchParams) {
  const db = getDb();
  const where = activeVehicleSearchWhere(params);
  const result = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM (
      SELECT ${vehicles.brandId}, ${vehicles.model}
      FROM ${vehicles}
      INNER JOIN ${brands} ON ${eq(vehicles.brandId, brands.id)}
      INNER JOIN ${vehicleCategories} ON ${eq(vehicles.categoryId, vehicleCategories.id)}
      WHERE ${where}
      GROUP BY ${vehicles.brandId}, ${vehicles.model}
    ) AS model_groups
  `);
  const row = result.rows[0] as { count?: number } | undefined;
  return row?.count ?? 0;
}

export async function listActiveVariantsForBrandModel(brandCode: string, model: string) {
  const db = getDb();
  return db
    .select({
      vehicle: vehicles,
      brand: brands,
      category: vehicleCategories,
    })
    .from(vehicles)
    .innerJoin(brands, eq(vehicles.brandId, brands.id))
    .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
    .where(
      and(
        eq(vehicles.active, true),
        sql`lower(${brands.code}) = lower(${brandCode})`,
        eq(vehicles.model, model),
      ),
    )
    .orderBy(sql`${vehicles.modelYear} DESC NULLS LAST`, vehicles.name);
}

export async function listActiveVehicleFilterOptions(brandCode?: string, categoryId?: number) {
  const db = getDb();
  const params: ActiveVehicleSearchParams = {
    ...(brandCode ? { brandCode } : {}),
    ...(categoryId != null ? { categoryId } : {}),
  };
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

export async function listDistrictsByLocationId(locationId: number) {
  const db = getDb();
  return db
    .select()
    .from(locationDistricts)
    .where(eq(locationDistricts.locationId, locationId))
    .orderBy(locationDistricts.name);
}

export async function findDistrictById(id: number) {
  const db = getDb();
  const rows = await db.select().from(locationDistricts).where(eq(locationDistricts.id, id)).limit(1);
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
