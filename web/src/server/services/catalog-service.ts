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
  mapVehicleSummary,
} from "../mappers";
import { getDealerPolicy, getFeePolicy, getPlateRegions } from "../config/policy-store";
import { calculateOnRoadCost } from "../domain/on-road-cost";
import type { CalculateOnRoadInput } from "../domain/types";

export async function getBrands() {
  const rows = await listBrands();
  return rows.map(mapBrand);
}

export async function getBrand(code: string) {
  const row = await findBrandByCode(code);
  if (!row) {
    return null;
  }
  return mapBrand(row);
}

export async function getCategories() {
  const rows = await listCategories();
  return rows.map(mapCategory);
}

export async function getLocations() {
  const rows = await listLocations();
  return rows.map(mapLocation);
}

export async function searchVehicles(params: {
  keyword?: string;
  brandCode?: string;
  categoryId?: number;
}) {
  const rows = await searchActiveVehicles(params);
  return rows.map(mapVehicleSummary);
}

export async function getVehicle(id: number) {
  const row = await findActiveVehicleById(id);
  if (!row) {
    return null;
  }
  return mapVehicleDetail(row);
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

export async function calculateOnRoad(body: {
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
}) {
  const vehicleRow = await findActiveVehicleById(body.vehicleId);
  if (!vehicleRow) {
    return null;
  }

  const location = await findLocationById(body.locationId);
  if (!location) {
    return { error: "location" as const };
  }

  const selectedCategory =
    body.categoryId != null
      ? await findCategoryById(body.categoryId)
      : vehicleRow.category;
  if (!selectedCategory) {
    return { error: "category" as const };
  }

  const [feePolicy, plateRegions, dealerPolicy, feeDefinitions, activeFeeRules] =
    await Promise.all([
      getFeePolicy(),
      getPlateRegions(),
      getDealerPolicy(),
      listActiveFeeDefinitions(),
      listActiveFeeRules(),
    ]);

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

  return { data: mapCostBreakdown(result) };
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
