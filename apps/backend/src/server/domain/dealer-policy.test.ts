import { describe, expect, it } from "vitest";

import type { DealerPolicyRecord } from "../config/types";
import {
  EXTRA_PERCENT,
  FORGO_FOR_CREDIT,
  discountPercent,
  priceVehicle,
} from "./dealer-policy";

function testPolicy(): DealerPolicyRecord {
  return {
    privateDiscountPercent: 5,
    commercialDiscountPercent: 8,
    offers: [
      {
        id: "gift-accessories",
        kind: FORGO_FOR_CREDIT,
        amount: 15_000_000,
        title: { vi: "Phụ kiện" },
      },
      {
        id: "month-campaign",
        kind: EXTRA_PERCENT,
        percent: 1.5,
        title: { vi: "Khuyến mại" },
      },
    ],
  };
}

describe("dealer policy", () => {
  const policy = testPolicy();

  it("commercial discount is higher than private", () => {
    expect(discountPercent(policy, "PRIVATE")).toBe(5);
    expect(discountPercent(policy, "COMMERCIAL")).toBe(8);
  });

  it("applies configured percent to list price", () => {
    const priced = priceVehicle(policy, 500_000_000, "PRIVATE", [], [], null);
    expect(priced.discountAmount).toBe(25_000_000);
    expect(priced.salePrice).toBe(475_000_000);
  });

  it("forgoing gift accessories credits the vehicle price", () => {
    const priced = priceVehicle(
      policy,
      500_000_000,
      "PRIVATE",
      [],
      ["gift-accessories"],
      null,
    );
    expect(priced.discountAmount).toBe(40_000_000);
    expect(priced.salePrice).toBe(460_000_000);
    expect(priced.appliedOfferIds).toContain("gift-accessories");
  });

  it("extra percent stacks on usage discount", () => {
    const priced = priceVehicle(
      policy,
      500_000_000,
      "PRIVATE",
      ["month-campaign"],
      [],
      null,
    );
    expect(priced.discountAmount).toBe(32_500_000);
  });
});
