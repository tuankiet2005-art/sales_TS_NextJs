import { describe, expect, it } from "vitest";

import {
  isPolicyOwnedFee,
  plateAmountForLocation,
  policyFeeAmount,
} from "../config/fee-policy";
import type { FeePolicyRecord, PlateRegionsRecord } from "../config/types";

function taxPolicy(privatePercent: number, commercialPercent: number): FeePolicyRecord {
  return {
    registrationTaxPercent: privatePercent,
    registrationTaxCommercialPercent: commercialPercent,
  };
}

function plateRegions(): PlateRegionsRecord {
  return {
    defaultArea: "AREA_II",
    areas: {
      AREA_I: { amount: 20_000_000 },
      AREA_II: { amount: 200_000 },
    },
    regions: {
      NORTH: [
        { code: "HN", name: "Hà Nội", area: "AREA_I" },
        { code: "QN", name: "Quảng Ninh", area: "AREA_II" },
      ],
      CENTRAL: [{ code: "DN", name: "Đà Nẵng", area: "AREA_II" }],
      SOUTH: [{ code: "HCM", name: "Thành phố Hồ Chí Minh", area: "AREA_I" }],
    },
  };
}

function location(code: string) {
  return { code, name: code };
}

describe("fee policy (ported from Java FeePolicyTest)", () => {
  const feePolicy = taxPolicy(10, 2);
  const regions = plateRegions();

  it("registration tax is percent of car price", () => {
    expect(
      policyFeeAmount(
        "REGISTRATION_TAX",
        531_000_000,
        "PRIVATE",
        location("HN"),
        feePolicy,
        regions,
      ),
    ).toBe(53_100_000);
  });

  it("license plate uses AREA_I amount for Hanoi and Ho Chi Minh", () => {
    expect(plateAmountForLocation(regions, "HN")).toBe(20_000_000);
    expect(plateAmountForLocation(regions, "HCM")).toBe(20_000_000);
  });

  it("license plate uses AREA_II amount for other provinces", () => {
    expect(plateAmountForLocation(regions, "DN")).toBe(200_000);
    expect(plateAmountForLocation(regions, "QN")).toBe(200_000);
  });

  it("unknown location falls back to default area", () => {
    expect(plateAmountForLocation(regions, "XX")).toBe(200_000);
  });

  it("applies only to policy fees", () => {
    expect(isPolicyOwnedFee("REGISTRATION_TAX")).toBe(true);
    expect(isPolicyOwnedFee("LICENSE_PLATE")).toBe(true);
    expect(isPolicyOwnedFee("ROAD_USE")).toBe(false);
  });

  it("commercial registration tax uses commercial percent", () => {
    expect(
      policyFeeAmount(
        "REGISTRATION_TAX",
        500_000_000,
        "PRIVATE",
        location("HN"),
        feePolicy,
        regions,
      ),
    ).toBe(50_000_000);
    expect(
      policyFeeAmount(
        "REGISTRATION_TAX",
        500_000_000,
        "COMMERCIAL",
        location("HN"),
        feePolicy,
        regions,
      ),
    ).toBe(10_000_000);
  });
});
