import {
  findActiveVehicleById,
  findBrandByCode,
  findCategoryById,
  findLocationById,
  listActiveFeeDefinitions,
  listActiveFeeRules,
  listBrands,
  listCategories,
  listLocations,
  searchActiveVehicles,
} from "../db/repositories/catalog";
import {
  mapBrand,
  mapCategory,
  mapCostBreakdown,
  mapLocation,
  mapVehicleDetail,
  mapVehicleSummaryWithPolicy,
} from "../mappers";
import { getDealerPolicy, loadPolicySnapshot } from "../config/policy-store";
import { calculateOnRoadCost } from "../domain/on-road-cost";
import type { CalculateOnRoadInput } from "../domain/types";
import type { Brand, Category, Location } from "@/types";

type CatalogListCache = {
  brands: Brand[] | null;
  categories: Category[] | null;
  locations: Location[] | null;
};

let catalogListCache: CatalogListCache = {
  brands: null,
  categories: null,
  locations: null,
};

type FeeDataCache = {
  definitions: Awaited<ReturnType<typeof listActiveFeeDefinitions>>;
  rules: Awaited<ReturnType<typeof listActiveFeeRules>>;
};

let feeDataCache: FeeDataCache | null = null;

export type ActiveVehicleRow = NonNullable<Awaited<ReturnType<typeof findActiveVehicleById>>>;

export type CalculateOnRoadBody = {
  vehicleId: number;
  locationId: number;
  categoryId?: number | null;
  includeOptionalInsurance?: boolean;
  discountAmount?: number | null;
  salePrice?: number | null;
  deposit?: number | null;
  optionalBodyInsurance?: number | null;
  registrationServiceFee?: number | null;
  micaPlateFee?: number | null;
  inspectionFee?: number | null;
  accessories?: { name: string; amount: number }[] | null;
  usageType?: string | null;
  selectedOfferIds?: string[] | null;
  forgoneOfferIds?: string[] | null;
};

async function getActiveFeeData(): Promise<FeeDataCache> {
  if (feeDataCache) {
    return feeDataCache;
  }
  const [definitions, rules] = await Promise.all([listActiveFeeDefinitions(), listActiveFeeRules()]);
  feeDataCache = { definitions, rules };
  return feeDataCache;
}

export function invalidateCatalogCache() {
  catalogListCache = { brands: null, categories: null, locations: null };
  feeDataCache = null;
}

export function resetCatalogCacheForTests() {
  invalidateCatalogCache();
}

export async function getBrands() {
  if (catalogListCache.brands) {
    return catalogListCache.brands;
  }
  const mapped = (await listBrands()).map(mapBrand);
  catalogListCache.brands = mapped;
  return mapped;
}

export async function getBrand(code: string) {
  const row = await findBrandByCode(code);
  if (!row) {
    return null;
  }
  return mapBrand(row);
}

export async function getCategories() {
  if (catalogListCache.categories) {
    return catalogListCache.categories;
  }
  const mapped = (await listCategories()).map(mapCategory);
  catalogListCache.categories = mapped;
  return mapped;
}

export async function getLocations() {
  if (catalogListCache.locations) {
    return catalogListCache.locations;
  }
  const mapped = (await listLocations()).map(mapLocation);
  catalogListCache.locations = mapped;
  return mapped;
}

export async function searchVehicles(params: {
  keyword?: string;
  brandCode?: string;
  categoryId?: number;
}) {
  const [rows, policy] = await Promise.all([searchActiveVehicles(params), getDealerPolicy()]);
  return rows.map((row) => mapVehicleSummaryWithPolicy(row, policy));
}

export async function getVehicle(id: number) {
  const [row, policy] = await Promise.all([findActiveVehicleById(id), getDealerPolicy()]);
  if (!row) {
    return null;
  }
  return mapVehicleDetail(row, policy);
}

export async function getDealerPolicyResponse() {
  const policy = await getDealerPolicy();
  return {
    privateDiscountPercent: policy.privateDiscountPercent,
    commercialDiscountPercent: policy.commercialDiscountPercent,
    offers: policy.offers.map((offer) => ({
      id: offer.id,
      kind: offer.kind,
      amount: offer.amount ?? undefined,
      percent: offer.percent ?? undefined,
      title: offer.title,
      description: offer.description ?? {},
    })),
  };
}

export async function calculateOnRoad(
  body: CalculateOnRoadBody,
  options?: { vehicleRow?: ActiveVehicleRow | null },
) {
  const vehicleLookup =
    options && "vehicleRow" in options
      ? Promise.resolve(options.vehicleRow ?? null)
      : findActiveVehicleById(body.vehicleId);

  const [vehicleRow, location, categoryById, policySnapshot, feeData] = await Promise.all([
    vehicleLookup,
    findLocationById(body.locationId),
    body.categoryId != null ? findCategoryById(body.categoryId) : Promise.resolve(null),
    loadPolicySnapshot(),
    getActiveFeeData(),
  ]);

  const { feePolicy, plateRegions, dealerPolicy } = policySnapshot;
  const { definitions: feeDefinitions, rules: activeFeeRules } = feeData;

  if (!vehicleRow) {
    return null;
  }
  if (!location) {
    return { error: "location" as const };
  }

  const selectedCategory = body.categoryId != null ? categoryById : vehicleRow.category;
  if (!selectedCategory) {
    return { error: "category" as const };
  }

  const input: CalculateOnRoadInput = {
    vehicle: {
      id: vehicleRow.vehicle.id,
      listPrice: vehicleRow.vehicle.listPrice,
      taxBasePrice: vehicleRow.vehicle.taxBasePrice,
      engineCc: vehicleRow.vehicle.engineCc,
      defaultDeposit: vehicleRow.vehicle.defaultDeposit,
      registrationServiceFee: vehicleRow.vehicle.registrationServiceFee,
      micaPlateFee: vehicleRow.vehicle.micaPlateFee,
      inspectionFee: vehicleRow.vehicle.inspectionFee,
      name: vehicleRow.vehicle.name,
      model: vehicleRow.vehicle.model,
      brandName: vehicleRow.brand.name,
      categoryId: vehicleRow.category.id,
      categoryName: vehicleRow.category.name,
    },
    location: {
      id: location.id,
      code: location.code,
      name: location.name,
      feeZone: location.feeZone,
    },
    categoryId: body.categoryId,
    includeOptionalInsurance: body.includeOptionalInsurance ?? false,
    discountAmount: body.discountAmount,
    salePrice: body.salePrice,
    deposit: body.deposit,
    optionalBodyInsurance: body.optionalBodyInsurance,
    registrationServiceFee: body.registrationServiceFee,
    micaPlateFee: body.micaPlateFee,
    inspectionFee: body.inspectionFee,
    accessories: body.accessories,
    usageType: body.usageType,
    selectedOfferIds: body.selectedOfferIds,
    forgoneOfferIds: body.forgoneOfferIds,
  };

  const result = calculateOnRoadCost(input, {
    feePolicy,
    plateRegions,
    dealerPolicy,
    feeDefinitions: feeDefinitions.map((def) => ({
      id: def.id,
      code: def.code,
      name: def.name,
      description: def.description,
      mandatory: def.mandatory,
      sortOrder: def.sortOrder,
    })),
    activeFeeRules: activeFeeRules.map((rule) => ({
      id: rule.id,
      feeDefinitionId: rule.feeDefinitionId,
      categoryId: rule.categoryId,
      locationId: rule.locationId,
      feeZone: rule.feeZone,
      calculationType: rule.calculationType as "FIXED" | "PERCENT_OF_LIST_PRICE" | "PERCENT_WITH_BOUNDS",
      fixedAmount: rule.fixedAmount,
      percentage: rule.percentage,
      minAmount: rule.minAmount,
      maxAmount: rule.maxAmount,
      minEngineCc: rule.minEngineCc,
      maxEngineCc: rule.maxEngineCc,
      minPrice: rule.minPrice,
      maxPrice: rule.maxPrice,
      priority: rule.priority,
    })),
    selectedCategoryId: selectedCategory.id,
    selectedCategoryName: selectedCategory.name,
  });

  return { data: mapCostBreakdown(result), vehicleRow };
}

export async function loadQuotePageData(body: CalculateOnRoadBody) {
  const [vehicleRow, policy] = await Promise.all([
    findActiveVehicleById(body.vehicleId),
    getDealerPolicy(),
  ]);
  if (!vehicleRow) {
    return null;
  }
  const calcResult = await calculateOnRoad(body, { vehicleRow });
  if (!calcResult || "error" in calcResult) {
    return calcResult;
  }
  return {
    vehicle: mapVehicleDetail(vehicleRow, policy),
    breakdown: calcResult.data,
  };
}

export async function getHealth() {
  try {
    const count = await listBrands().then((rows) => rows.length);
    return {
      status: "UP",
      database: "UP",
      brands: String(count),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return {
      status: "DEGRADED",
      database: "DOWN",
      databaseError: message,
    };
  }
}
