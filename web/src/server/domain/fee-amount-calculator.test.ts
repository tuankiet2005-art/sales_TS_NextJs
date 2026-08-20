import { describe, expect, it } from "vitest";

import { calculateFeeAmount } from "./fee-amount-calculator";
import type { FeeRuleRow, VehicleRow } from "./types";

describe("calculateFeeAmount", () => {
  const vehicle: VehicleRow = {
    id: 1,
    listPrice: 531_000_000,
    name: "Test",
    model: "X",
    brandName: "Mitsubishi",
    categoryId: 3,
    categoryName: "Cars",
  };

  it("calculates fixed amount", () => {
    const rule: FeeRuleRow = {
      id: 1,
      feeDefinitionId: 1,
      calculationType: "FIXED",
      fixedAmount: 20_000_000,
      priority: 0,
    };
    expect(calculateFeeAmount(rule, vehicle)).toBe(20_000_000);
  });

  it("calculates percentage of list price", () => {
    const rule: FeeRuleRow = {
      id: 2,
      feeDefinitionId: 1,
      calculationType: "PERCENT_OF_LIST_PRICE",
      percentage: 12,
      priority: 0,
    };
    expect(calculateFeeAmount(rule, vehicle)).toBe(63_720_000);
  });

  it("applies minimum bound", () => {
    const rule: FeeRuleRow = {
      id: 3,
      feeDefinitionId: 1,
      calculationType: "PERCENT_WITH_BOUNDS",
      percentage: 1,
      minAmount: 10_000_000,
      priority: 0,
    };
    const cheapVehicle: VehicleRow = { ...vehicle, listPrice: 100_000 };
    expect(calculateFeeAmount(rule, cheapVehicle)).toBe(10_000_000);
  });
});
