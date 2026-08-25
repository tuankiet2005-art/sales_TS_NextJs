import type {
  Brand,
  Category,
  CostBreakdown,
  Location,
  LocationDistrict,
  VehicleDetail,
  VehicleModelContext,
  VehicleModelDetail,
  VehicleModelSummary,
  VehicleSummary,
} from "@/types";
import { vehicleImageUrl } from "@/lib/vehicleImageUrl";
import { parseColorPhotosJson, resolveColorPhotoMap } from "@/lib/colorPhotos";
import type { Brand as DbBrand, Location as DbLocation, LocationDistrict as DbLocationDistrict, Vehicle, vehicleCategories } from "./db/schema";

type VehicleCategory = typeof vehicleCategories.$inferSelect;
import type { OnRoadCostResult } from "./domain/types";
import { priceVehicle } from "./domain/dealer-policy";
import { toNumber } from "./domain/money";
import type { DealerPolicyRecord } from "./config/types";
import type { ActiveModelSummaryRow } from "./db/repositories/catalog";

function num(value: string | number | null | undefined): number {
  return value == null ? 0 : Number(value);
}

export function mapBrand(brand: DbBrand): Brand {
  return {
    id: brand.id,
    code: brand.code,
    name: brand.name,
    tagline: brand.tagline ?? "",
    market: brand.market,
    accentColor: brand.accentColor ?? "",
    imageUrl: brand.imageUrl ?? "",
    ready: brand.ready,
  };
}

export function mapCategory(category: VehicleCategory): Category {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description ?? "",
    typicalSeats: category.typicalSeats,
    requiresInspection: category.requiresInspection,
    requiresRoadUseFee: category.requiresRoadUseFee,
    requiresCompulsoryInsurance: category.requiresCompulsoryInsurance,
  };
}

export function mapLocation(location: DbLocation): Location {
  return {
    id: location.id,
    code: location.code,
    name: location.name,
    nameEn: location.nameEn,
    nameZh: location.nameZh,
    nameJa: location.nameJa,
    region: location.region,
    feeZone: location.feeZone,
    centrallyGovernedCity: location.centrallyGovernedCity,
  };
}

export function mapLocationDistrict(district: DbLocationDistrict): LocationDistrict {
  return {
    id: district.id,
    locationId: district.locationId,
    code: district.code,
    name: district.name,
    nameEn: district.nameEn,
    nameZh: district.nameZh,
    nameJa: district.nameJa,
  };
}

type VehicleSummarySource = {
  vehicle: Pick<
    Vehicle,
    "id" | "model" | "name" | "seats" | "vehicleType" | "modelYear" | "listPrice" | "imageUrl"
  >;
  brand: Pick<DbBrand, "name" | "code">;
  category: VehicleCategory;
};

export function mapVehicleSummary(row: VehicleSummarySource): VehicleSummary {
  const { vehicle, brand, category } = row;
  return {
    id: vehicle.id,
    brand: brand.name,
    brandCode: brand.code,
    model: vehicle.model,
    name: vehicle.name,
    year: vehicle.modelYear ?? 0,
    seats: vehicle.seats,
    vehicleType: vehicle.vehicleType ?? "",
    listPrice: num(vehicle.listPrice),
    imageUrl: vehicleImageUrl(vehicle.imageUrl ?? ""),
    category: mapCategory(category),
  };
}

/** Public catalog prices follow dealer policy (private usage), not legacy DB discount columns. */
export function mapVehicleSummaryWithPolicy(
  row: VehicleSummarySource,
  policy: DealerPolicyRecord,
): VehicleSummary {
  const summary = mapVehicleSummary(row);
  const pricing = priceVehicle(policy, summary.listPrice, "PRIVATE", [], [], null);
  return {
    ...summary,
    discountAmount: pricing.discountAmount,
    salePrice: pricing.salePrice,
  };
}

export function mapVehicleModelSummary(row: ActiveModelSummaryRow, policy: DealerPolicyRecord, trimCount: number): VehicleModelSummary {
  const minListPrice = num(row.minListPrice);
  const pricing = priceVehicle(policy, minListPrice, "PRIVATE", [], [], null);
  return {
    brand: row.brandName,
    brandCode: row.brandCode,
    model: row.model,
    yearMin: row.yearMin,
    yearMax: row.yearMax,
    minListPrice,
    minSalePrice: pricing.salePrice,
    imageUrl: vehicleImageUrl(row.repImageUrl ?? ""),
    category: mapCategory(row.category),
    trimCount,
  };
}

export function buildVehicleModelContext(
  model: string,
  current: VehicleSummary,
  variants: VehicleSummary[],
): VehicleModelContext {
  const years = [...new Set(variants.map((item) => item.year).filter((year) => year > 0))].sort((a, b) => b - a);
  const trimsForYear = variants
    .filter((item) => item.year === current.year)
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    model,
    year: current.year,
    availableYears: years,
    trimsForYear,
  };
}

export function mapVehicleModelDetail(
  model: string,
  brand: Pick<DbBrand, "name" | "code">,
  variants: VehicleDetail[],
): VehicleModelDetail {
  const years = [...new Set(variants.map((item) => item.year).filter((year) => year > 0))].sort((a, b) => b - a);
  const defaultYear = years[0] ?? variants[0]?.year ?? 0;
  const trimsByYear: Record<string, VehicleDetail[]> = {};
  for (const year of years) {
    trimsByYear[String(year)] = variants
      .filter((item) => item.year === year)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return {
    brand: brand.name,
    brandCode: brand.code,
    model,
    years,
    defaultYear,
    trimsByYear,
  };
}

function parseJsonRecord(value: string | null | undefined): Record<string, string> {
  if (!value?.trim()) {
    return {};
  }
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

export function mapVehicleDetail(
  row: VehicleSummarySource & { vehicle: Vehicle },
  policy?: DealerPolicyRecord,
): VehicleDetail {
  const summary = policy ? mapVehicleSummaryWithPolicy(row, policy) : mapVehicleSummary(row);
  const vehicle = row.vehicle;
  return {
    ...summary,
    engineCc: vehicle.engineCc,
    fuelType: vehicle.fuelType ?? "",
    transmission: vehicle.transmission ?? "",
    defaultDeposit: vehicle.defaultDeposit != null ? num(vehicle.defaultDeposit) : undefined,
    registrationServiceFee:
      vehicle.registrationServiceFee != null ? num(vehicle.registrationServiceFee) : undefined,
    micaPlateFee: vehicle.micaPlateFee != null ? num(vehicle.micaPlateFee) : undefined,
    inspectionFee: vehicle.inspectionFee != null ? num(vehicle.inspectionFee) : undefined,
    defaultColor: vehicle.defaultColor ?? undefined,
    availableColors: vehicle.availableColors ?? undefined,
    colorPhotos: resolveColorPhotoMap(parseColorPhotosJson(vehicle.colorPhotos)),
    deliveryNote: vehicle.deliveryNote ?? undefined,
    warrantyNote: vehicle.warrantyNote ?? undefined,
    gifts: vehicle.gifts ?? undefined,
    specifications: parseJsonRecord(vehicle.specifications),
  };
}

export function mapCostBreakdown(result: OnRoadCostResult): CostBreakdown {
  return {
    vehicleId: result.vehicleId,
    vehicleName: result.vehicleName,
    brand: result.brandName,
    model: result.model,
    categoryName: result.categoryName,
    locationId: result.locationId,
    locationName: result.locationName,
    listPrice: result.listPrice,
    discountAmount: result.discountAmount,
    salePrice: result.salePrice,
    fees: result.fees.map((fee: OnRoadCostResult["fees"][number]) => ({
      code: fee.code,
      name: fee.name,
      description: fee.description ?? "",
      mandatory: fee.mandatory,
      applicable: fee.applicable,
      includedInTotal: fee.includedInTotal,
      amount: fee.amount,
      calculationNote: fee.note,
    })),
    totalMandatoryFees: result.totalMandatory,
    totalOptionalFees: result.totalOptional,
    accessoriesTotal: result.accessoriesTotal,
    estimatedOnRoadTotal: result.estimatedTotal,
    deposit: result.deposit,
    accessories: result.accessories,
    currency: result.currency,
    usageType: result.usageType,
    discountPercent: result.discountPercent,
    appliedOfferIds: result.appliedOfferIds,
  };
}
