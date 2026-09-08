import type { Location } from "../db/schema";
import type { PlateRegionsRecord } from "./types";

export function plateAreaForLocation(
  plateRegions: PlateRegionsRecord,
  locationCode: string | null | undefined,
): string {
  const unit = plateUnitForLocation(plateRegions, locationCode);
  if (unit?.area) {
    return unit.area;
  }
  return plateRegions.defaultArea || "AREA_II";
}

export function plateUnitForLocation(
  plateRegions: PlateRegionsRecord,
  locationCode: string | null | undefined,
) {
  if (!locationCode?.trim()) {
    return null;
  }
  const needle = locationCode.trim().toUpperCase();
  for (const units of Object.values(plateRegions.regions)) {
    for (const unit of units) {
      if (unit.code.trim().toUpperCase() === needle) {
        return unit;
      }
    }
  }
  return null;
}

export function plateAmountForLocation(
  plateRegions: PlateRegionsRecord,
  locationCode: string | null | undefined,
): number {
  const area = plateAreaForLocation(plateRegions, locationCode);
  return plateRegions.areas[area]?.amount ?? 0;
}

export function registrationTaxPercent(
  feePolicy: { registrationTaxPercent: number; registrationTaxCommercialPercent: number },
  usageType: string | null | undefined,
): number {
  if (usageType?.toUpperCase() === "COMMERCIAL") {
    return feePolicy.registrationTaxCommercialPercent;
  }
  return feePolicy.registrationTaxPercent;
}

export function policyFeeAmount(
  feeCode: string,
  carPrice: number,
  usageType: string | null | undefined,
  location: Pick<Location, "code"> | null,
  feePolicy: { registrationTaxPercent: number; registrationTaxCommercialPercent: number },
  plateRegions: PlateRegionsRecord,
): number {
  if (feeCode === "LICENSE_PLATE") {
    return plateAmountForLocation(plateRegions, location?.code);
  }
  if (feeCode === "REGISTRATION_TAX") {
    const percent = registrationTaxPercent(feePolicy, usageType);
    return Math.round((carPrice * percent) / 100);
  }
  return 0;
}

export function isPolicyOwnedFee(feeCode: string): boolean {
  return feeCode === "REGISTRATION_TAX" || feeCode === "LICENSE_PLATE";
}

export function describePolicyFee(
  feeCode: string,
  usageType: string | null | undefined,
  location: Pick<Location, "code" | "name"> | null,
  feePolicy: { registrationTaxPercent: number; registrationTaxCommercialPercent: number },
  plateRegions: PlateRegionsRecord,
): string {
  if (feeCode === "LICENSE_PLATE") {
    const area = plateAreaForLocation(plateRegions, location?.code);
    const unit = plateUnitForLocation(plateRegions, location?.code);
    const place = unit?.name ?? "default";
    return `Fixed plate fee — ${area} (${place})`;
  }
  if (feeCode === "REGISTRATION_TAX") {
    const percent = registrationTaxPercent(feePolicy, usageType);
    return `${percent}% of selling price`;
  }
  return "";
}
