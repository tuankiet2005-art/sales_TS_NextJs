import { describe, expect, it } from "vitest";

import type { DealerPolicy } from "../types";
import { priceVehicleFromPolicy } from "./dealerPricing";

const policy: DealerPolicy = {
  privateDiscountPercent: 5,
  commercialDiscountPercent: 8,
  offers: [],
};

describe("priceVehicleFromPolicy", () => {
  it("matches server policy pricing for Attrage CVT Premium list price", () => {
    const priced = priceVehicleFromPolicy(policy, 490_000_000, "PRIVATE", [], []);
    expect(priced.discountAmount).toBe(24_500_000);
    expect(priced.salePrice).toBe(465_500_000);
  });
});
