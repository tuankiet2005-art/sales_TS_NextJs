import type { FeeDefinitionRow, FeeRuleRow, LocationRow, VehicleRow } from "./types";

export function resolveFeeRule(
  definition: FeeDefinitionRow,
  vehicle: VehicleRow,
  selectedCategoryId: number,
  location: LocationRow,
  activeRules: FeeRuleRow[],
): FeeRuleRow | null {
  const matches = activeRules
    .filter((rule) => rule.feeDefinitionId === definition.id)
    .filter((rule) => matchesCategory(rule, selectedCategoryId))
    .filter((rule) => matchesLocation(rule, location))
    .filter((rule) => matchesEngine(rule, vehicle))
    .filter((rule) => matchesPrice(rule, toListPrice(vehicle)));

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((left, right) => {
    const scoreDiff = specificityScore(right) - specificityScore(left);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return right.priority - left.priority;
  })[0];
}

function matchesCategory(rule: FeeRuleRow, selectedCategoryId: number): boolean {
  return rule.categoryId == null || rule.categoryId === selectedCategoryId;
}

function matchesLocation(rule: FeeRuleRow, location: LocationRow): boolean {
  if (rule.locationId != null) {
    return rule.locationId === location.id;
  }
  if (rule.feeZone) {
    return rule.feeZone === location.feeZone;
  }
  return true;
}

function matchesEngine(rule: FeeRuleRow, vehicle: VehicleRow): boolean {
  const engineCc = vehicle.engineCc ?? null;
  if (rule.minEngineCc != null) {
    if (engineCc == null || engineCc < rule.minEngineCc) {
      return false;
    }
  }
  if (rule.maxEngineCc != null) {
    if (engineCc == null || engineCc > rule.maxEngineCc) {
      return false;
    }
  }
  return true;
}

function matchesPrice(rule: FeeRuleRow, listPrice: number): boolean {
  const minPrice = rule.minPrice != null ? Number(rule.minPrice) : null;
  const maxPrice = rule.maxPrice != null ? Number(rule.maxPrice) : null;
  if (minPrice != null && listPrice < minPrice) {
    return false;
  }
  return maxPrice == null || listPrice <= maxPrice;
}

function specificityScore(rule: FeeRuleRow): number {
  let score = 0;
  if (rule.categoryId != null) {
    score += 10;
  }
  if (rule.locationId != null) {
    score += 20;
  } else if (rule.feeZone) {
    score += 10;
  }
  if (rule.minEngineCc != null || rule.maxEngineCc != null) {
    score += 5;
  }
  if (rule.minPrice != null || rule.maxPrice != null) {
    score += 5;
  }
  return score;
}

function toListPrice(vehicle: VehicleRow): number {
  return Number(vehicle.listPrice);
}
