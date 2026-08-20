import { describe, expect, it } from "vitest";

import type { FeeDefinitionRow, FeeRuleRow, LocationRow, VehicleRow } from "./types";
import { resolveFeeRule } from "./fee-rule-resolver";

describe("resolveFeeRule", () => {
  it("prefers location-specific rule over national rule", () => {
    const definition: FeeDefinitionRow = {
      id: 1,
      code: "REGISTRATION_TAX",
      name: "Registration tax",
      mandatory: true,
      sortOrder: 1,
    };
    const hanoi: LocationRow = { id: 10, code: "HN", name: "Hà Nội", feeZone: "SPECIAL" };
    const national: FeeRuleRow = {
      id: 1,
      feeDefinitionId: 1,
      categoryId: 3,
      calculationType: "PERCENT_OF_LIST_PRICE",
      percentage: 10,
      priority: 0,
    };
    const hanoiOnly: FeeRuleRow = {
      id: 2,
      feeDefinitionId: 1,
      categoryId: 3,
      locationId: 10,
      calculationType: "PERCENT_OF_LIST_PRICE",
      percentage: 12,
      priority: 0,
    };
    const vehicle: VehicleRow = {
      id: 1,
      listPrice: 500_000_000,
      name: "Test",
      model: "X",
      brandName: "Mitsubishi",
      categoryId: 3,
      categoryName: "Cars",
    };

    expect(
      resolveFeeRule(definition, vehicle, 3, hanoi, [national, hanoiOnly]),
    ).toEqual(hanoiOnly);
  });

  it("skips rules for other categories", () => {
    const definition: FeeDefinitionRow = {
      id: 2,
      code: "INSPECTION",
      name: "Inspection",
      mandatory: true,
      sortOrder: 2,
    };
    const hue: LocationRow = { id: 15, code: "HUE", name: "Huế", feeZone: "MAJOR" };
    const carInspection: FeeRuleRow = {
      id: 5,
      feeDefinitionId: 2,
      categoryId: 3,
      calculationType: "FIXED",
      fixedAmount: 340_000,
      priority: 0,
    };
    const motorcycle: VehicleRow = {
      id: 2,
      listPrice: 52_000_000,
      name: "Bike",
      model: "Y",
      brandName: "Mitsubishi",
      categoryId: 1,
      categoryName: "Motorcycle",
    };

    expect(
      resolveFeeRule(definition, motorcycle, 1, hue, [carInspection]),
    ).toBeNull();
  });
});
