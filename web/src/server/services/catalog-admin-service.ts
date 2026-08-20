import { and, eq, sql } from "drizzle-orm";

import type {
  AdminBrand,
  AdminCategory,
  AdminDealer,
  AdminFeeDefinition,
  AdminFeeRule,
  AdminLocation,
  AdminVehicle,
  CatalogSnapshot,
  ImportResult,
} from "@/types";
import { getDb } from "../db/client";
import {
  brands,
  dealers,
  feeDefinitions,
  feeRules,
  locations,
  vehicleCategories,
  vehicles,
} from "../db/schema";
import { isPolicyOwnedFee } from "../config/fee-policy";

function slug(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function brandIdByCode(code: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(brands)
    .where(sql`lower(${brands.code}) = lower(${code})`)
    .limit(1);
  return rows[0]?.id ?? null;
}

async function categoryIdByCode(code: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(vehicleCategories)
    .where(sql`lower(${vehicleCategories.code}) = lower(${code})`)
    .limit(1);
  return rows[0]?.id ?? null;
}

async function locationIdByCode(code: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(locations)
    .where(sql`lower(${locations.code}) = lower(${code})`)
    .limit(1);
  return rows[0]?.id ?? null;
}

async function feeDefinitionIdByCode(code: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(feeDefinitions)
    .where(sql`lower(${feeDefinitions.code}) = lower(${code})`)
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function exportAll(): Promise<CatalogSnapshot> {
  const db = getDb();
  const [brandRows, categoryRows, locationRows, dealerRows, feeDefRows, vehicleRows, feeRuleRows] =
    await Promise.all([
      db.select().from(brands).orderBy(brands.sortOrder, brands.name),
      db.select().from(vehicleCategories).orderBy(vehicleCategories.sortOrder, vehicleCategories.name),
      db.select().from(locations).orderBy(locations.name),
      db.select().from(dealers).orderBy(dealers.name),
      db.select().from(feeDefinitions).orderBy(feeDefinitions.sortOrder, feeDefinitions.name),
      db
        .select({ vehicle: vehicles, brand: brands, category: vehicleCategories })
        .from(vehicles)
        .innerJoin(brands, eq(vehicles.brandId, brands.id))
        .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
        .orderBy(vehicles.name),
      db
        .select({
          rule: feeRules,
          definition: feeDefinitions,
          category: vehicleCategories,
          location: locations,
        })
        .from(feeRules)
        .innerJoin(feeDefinitions, eq(feeRules.feeDefinitionId, feeDefinitions.id))
        .leftJoin(vehicleCategories, eq(feeRules.categoryId, vehicleCategories.id))
        .leftJoin(locations, eq(feeRules.locationId, locations.id))
        .orderBy(feeRules.id),
    ]);

  return {
    brands: brandRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      tagline: row.tagline ?? undefined,
      market: row.market,
      accentColor: row.accentColor ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
      ready: row.ready,
      sortOrder: row.sortOrder,
    })),
    categories: categoryRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      typicalSeats: row.typicalSeats,
      requiresInspection: row.requiresInspection,
      requiresRoadUseFee: row.requiresRoadUseFee,
      requiresCompulsoryInsurance: row.requiresCompulsoryInsurance,
      sortOrder: row.sortOrder,
    })),
    locations: locationRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      nameEn: row.nameEn,
      nameZh: row.nameZh,
      nameJa: row.nameJa,
      region: row.region,
      feeZone: row.feeZone,
      centrallyGovernedCity: row.centrallyGovernedCity,
    })),
    dealers: await Promise.all(
      dealerRows.map(async (row) => {
        const brand = await db.select().from(brands).where(eq(brands.id, row.brandId)).limit(1);
        return {
          id: row.id,
          brandCode: brand[0]?.code ?? "",
          name: row.name,
          address: row.address ?? undefined,
          market: row.market,
          active: row.active,
        };
      }),
    ),
    feeDefinitions: feeDefRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      mandatory: row.mandatory,
      sortOrder: row.sortOrder,
      active: row.active,
    })),
    vehicles: vehicleRows.map(({ vehicle, brand, category }) => ({
      id: vehicle.id,
      brandCode: brand.code,
      categoryCode: category.code,
      model: vehicle.model,
      name: vehicle.name,
      seats: vehicle.seats,
      vehicleType: vehicle.vehicleType ?? undefined,
      year: vehicle.modelYear,
      engineCc: vehicle.engineCc,
      fuelType: vehicle.fuelType ?? undefined,
      transmission: vehicle.transmission ?? undefined,
      listPrice: Number(vehicle.listPrice),
      discountAmount: vehicle.discountAmount != null ? Number(vehicle.discountAmount) : null,
      salePrice: vehicle.salePrice != null ? Number(vehicle.salePrice) : null,
      taxBasePrice: vehicle.taxBasePrice != null ? Number(vehicle.taxBasePrice) : null,
      defaultDeposit: vehicle.defaultDeposit != null ? Number(vehicle.defaultDeposit) : null,
      registrationServiceFee:
        vehicle.registrationServiceFee != null ? Number(vehicle.registrationServiceFee) : null,
      micaPlateFee: vehicle.micaPlateFee != null ? Number(vehicle.micaPlateFee) : null,
      inspectionFee: vehicle.inspectionFee != null ? Number(vehicle.inspectionFee) : null,
      defaultColor: vehicle.defaultColor ?? undefined,
      availableColors: vehicle.availableColors ?? undefined,
      colorPhotos: vehicle.colorPhotos ? JSON.parse(vehicle.colorPhotos) : undefined,
      deliveryNote: vehicle.deliveryNote ?? undefined,
      warrantyNote: vehicle.warrantyNote ?? undefined,
      gifts: vehicle.gifts ?? undefined,
      quoteSheetName: vehicle.quoteSheetName ?? undefined,
      imageUrl: vehicle.imageUrl ?? undefined,
      specifications: vehicle.specifications ? JSON.parse(vehicle.specifications) : undefined,
      active: vehicle.active,
    })),
    feeRules: feeRuleRows
      .filter(({ definition }) => !isPolicyOwnedFee(definition.code))
      .map(({ rule, definition, category, location }) => ({
        id: rule.id,
        feeDefinitionCode: definition.code,
        categoryCode: category?.code ?? null,
        locationCode: location?.code ?? null,
        feeZone: rule.feeZone,
        calculationType: rule.calculationType,
        fixedAmount: rule.fixedAmount != null ? Number(rule.fixedAmount) : null,
        percentage: rule.percentage != null ? Number(rule.percentage) : null,
        minAmount: rule.minAmount != null ? Number(rule.minAmount) : null,
        maxAmount: rule.maxAmount != null ? Number(rule.maxAmount) : null,
        minEngineCc: rule.minEngineCc,
        maxEngineCc: rule.maxEngineCc,
        minPrice: rule.minPrice != null ? Number(rule.minPrice) : null,
        maxPrice: rule.maxPrice != null ? Number(rule.maxPrice) : null,
        priority: rule.priority,
        effectiveFrom: rule.effectiveFrom ?? null,
        effectiveTo: rule.effectiveTo ?? null,
        active: rule.active,
      })),
  };
}

export async function importAll(snapshot: CatalogSnapshot): Promise<ImportResult> {
  return {
    brands: (await Promise.all((snapshot.brands ?? []).map((item) => upsertBrand(item)))).length,
    categories: (await Promise.all((snapshot.categories ?? []).map((item) => upsertCategory(item)))).length,
    locations: (await Promise.all((snapshot.locations ?? []).map((item) => upsertLocation(item)))).length,
    dealers: (await Promise.all((snapshot.dealers ?? []).map((item) => upsertDealer(item)))).length,
    feeDefinitions: (await Promise.all((snapshot.feeDefinitions ?? []).map((item) => upsertFeeDefinition(item)))).length,
    vehicles: (await Promise.all((snapshot.vehicles ?? []).map((item) => upsertVehicle(item)))).length,
    feeRules: (await Promise.all((snapshot.feeRules ?? []).map((item) => upsertFeeRule(item)))).length,
  };
}

export async function listAdminBrands() {
  return (await exportAll()).brands ?? [];
}

export async function upsertBrand(record: AdminBrand) {
  const db = getDb();
  const code = record.code?.trim() || slug(record.name);
  const values = {
    code,
    name: record.name.trim(),
    tagline: record.tagline ?? null,
    market: record.market ?? "Vietnam",
    accentColor: record.accentColor ?? null,
    imageUrl: record.imageUrl ?? null,
    ready: record.ready ?? true,
    sortOrder: record.sortOrder ?? 0,
  };
  if (record.id) {
    const rows = await db.update(brands).set(values).where(eq(brands.id, record.id)).returning();
    return rows[0];
  }
  const rows = await db.insert(brands).values(values).returning();
  return rows[0];
}

export async function deleteBrand(id: number) {
  const db = getDb();
  await db.delete(brands).where(eq(brands.id, id));
}

export async function listAdminCategories() {
  return (await exportAll()).categories ?? [];
}

export async function upsertCategory(record: AdminCategory) {
  const db = getDb();
  const code = record.code?.trim() || slug(record.name);
  const values = {
    code,
    name: record.name.trim(),
    description: record.description ?? null,
    typicalSeats: record.typicalSeats ?? null,
    requiresInspection: record.requiresInspection ?? false,
    requiresRoadUseFee: record.requiresRoadUseFee ?? false,
    requiresCompulsoryInsurance: record.requiresCompulsoryInsurance ?? false,
    sortOrder: record.sortOrder ?? 0,
  };
  if (record.id) {
    const rows = await db.update(vehicleCategories).set(values).where(eq(vehicleCategories.id, record.id)).returning();
    return rows[0];
  }
  const rows = await db.insert(vehicleCategories).values(values).returning();
  return rows[0];
}

export async function deleteCategory(id: number) {
  const db = getDb();
  await db.delete(vehicleCategories).where(eq(vehicleCategories.id, id));
}

export async function listAdminLocations() {
  return (await exportAll()).locations ?? [];
}

export async function upsertLocation(record: AdminLocation) {
  const db = getDb();
  const code = record.code?.trim() || slug(record.name);
  const values = {
    code,
    name: record.name.trim(),
    nameEn: record.nameEn ?? record.name,
    nameZh: record.nameZh ?? record.name,
    nameJa: record.nameJa ?? record.name,
    region: record.region,
    feeZone: record.feeZone,
    centrallyGovernedCity: record.centrallyGovernedCity ?? false,
  };
  if (record.id) {
    const rows = await db.update(locations).set(values).where(eq(locations.id, record.id)).returning();
    return rows[0];
  }
  const rows = await db.insert(locations).values(values).returning();
  return rows[0];
}

export async function deleteLocation(id: number) {
  const db = getDb();
  await db.delete(locations).where(eq(locations.id, id));
}

export async function listAdminDealers() {
  return (await exportAll()).dealers ?? [];
}

export async function upsertDealer(record: AdminDealer) {
  const db = getDb();
  const brandId = await brandIdByCode(record.brandCode);
  if (!brandId) {
    throw new Error(`Unknown brand ${record.brandCode}`);
  }
  const values = {
    brandId,
    name: record.name.trim(),
    address: record.address ?? null,
    market: record.market ?? "Vietnam",
    active: record.active ?? true,
  };
  if (record.id) {
    const rows = await db.update(dealers).set(values).where(eq(dealers.id, record.id)).returning();
    return rows[0];
  }
  const rows = await db.insert(dealers).values(values).returning();
  return rows[0];
}

export async function deleteDealer(id: number) {
  const db = getDb();
  await db.delete(dealers).where(eq(dealers.id, id));
}

export async function listAdminFeeDefinitions() {
  return (await exportAll()).feeDefinitions ?? [];
}

export async function upsertFeeDefinition(record: AdminFeeDefinition) {
  const db = getDb();
  const code = record.code?.trim() || slug(record.name);
  const values = {
    code,
    name: record.name.trim(),
    description: record.description ?? null,
    mandatory: record.mandatory ?? true,
    sortOrder: record.sortOrder ?? 0,
    active: record.active ?? true,
  };
  if (record.id) {
    const rows = await db.update(feeDefinitions).set(values).where(eq(feeDefinitions.id, record.id)).returning();
    return rows[0];
  }
  const rows = await db.insert(feeDefinitions).values(values).returning();
  return rows[0];
}

export async function deleteFeeDefinition(id: number) {
  const db = getDb();
  await db.delete(feeDefinitions).where(eq(feeDefinitions.id, id));
}

export async function listAdminVehicles() {
  return (await exportAll()).vehicles ?? [];
}

export async function upsertVehicle(record: AdminVehicle) {
  const db = getDb();
  const brandId = await brandIdByCode(record.brandCode);
  const categoryId = await categoryIdByCode(record.categoryCode);
  if (!brandId || !categoryId) {
    throw new Error("Unknown brand or category");
  }
  const values = {
    brandId,
    categoryId,
    model: record.model.trim(),
    name: record.name.trim(),
    seats: record.seats ?? null,
    vehicleType: record.vehicleType ?? null,
    modelYear: record.year ?? null,
    engineCc: record.engineCc ?? null,
    fuelType: record.fuelType ?? null,
    transmission: record.transmission ?? null,
    listPrice: String(record.listPrice),
    discountAmount: record.discountAmount != null ? String(record.discountAmount) : null,
    salePrice: record.salePrice != null ? String(record.salePrice) : null,
    taxBasePrice: record.taxBasePrice != null ? String(record.taxBasePrice) : null,
    defaultDeposit: record.defaultDeposit != null ? String(record.defaultDeposit) : null,
    registrationServiceFee:
      record.registrationServiceFee != null ? String(record.registrationServiceFee) : null,
    micaPlateFee: record.micaPlateFee != null ? String(record.micaPlateFee) : null,
    inspectionFee: record.inspectionFee != null ? String(record.inspectionFee) : null,
    defaultColor: record.defaultColor ?? null,
    availableColors: record.availableColors ?? null,
    colorPhotos: record.colorPhotos ? JSON.stringify(record.colorPhotos) : null,
    deliveryNote: record.deliveryNote ?? null,
    warrantyNote: record.warrantyNote ?? null,
    gifts: record.gifts ?? null,
    quoteSheetName: record.quoteSheetName ?? null,
    imageUrl: record.imageUrl ?? null,
    specifications: record.specifications ? JSON.stringify(record.specifications) : null,
    active: record.active ?? true,
  };
  if (record.id) {
    const rows = await db.update(vehicles).set(values).where(eq(vehicles.id, record.id)).returning();
    return rows[0];
  }
  const rows = await db.insert(vehicles).values(values).returning();
  return rows[0];
}

export async function deleteVehicle(id: number) {
  const db = getDb();
  await db.delete(vehicles).where(eq(vehicles.id, id));
}

export async function listAdminFeeRules() {
  return (await exportAll()).feeRules ?? [];
}

export async function upsertFeeRule(record: AdminFeeRule) {
  if (isPolicyOwnedFee(record.feeDefinitionCode)) {
    throw new Error("Policy-owned fees cannot be edited as fee rules");
  }
  const db = getDb();
  const feeDefinitionId = await feeDefinitionIdByCode(record.feeDefinitionCode);
  if (!feeDefinitionId) {
    throw new Error(`Unknown fee definition ${record.feeDefinitionCode}`);
  }
  const categoryId = record.categoryCode ? await categoryIdByCode(record.categoryCode) : null;
  const locationId = record.locationCode ? await locationIdByCode(record.locationCode) : null;
  const values = {
    feeDefinitionId,
    categoryId,
    locationId,
    feeZone: record.feeZone ?? null,
    calculationType: record.calculationType,
    fixedAmount: record.fixedAmount != null ? String(record.fixedAmount) : null,
    percentage: record.percentage != null ? String(record.percentage) : null,
    minAmount: record.minAmount != null ? String(record.minAmount) : null,
    maxAmount: record.maxAmount != null ? String(record.maxAmount) : null,
    minEngineCc: record.minEngineCc ?? null,
    maxEngineCc: record.maxEngineCc ?? null,
    minPrice: record.minPrice != null ? String(record.minPrice) : null,
    maxPrice: record.maxPrice != null ? String(record.maxPrice) : null,
    priority: record.priority ?? 0,
    effectiveFrom: record.effectiveFrom ?? null,
    effectiveTo: record.effectiveTo ?? null,
    active: record.active ?? true,
  };
  if (record.id) {
    const rows = await db.update(feeRules).set(values).where(eq(feeRules.id, record.id)).returning();
    return rows[0];
  }
  const rows = await db.insert(feeRules).values(values).returning();
  return rows[0];
}

export async function deleteFeeRule(id: number) {
  const db = getDb();
  await db.delete(feeRules).where(eq(feeRules.id, id));
}
