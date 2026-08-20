import { describe, expect, it } from "vitest";

import {
  plateAmountForLocation,
  policyFeeAmount,
  registrationTaxPercent,
} from "./fee-policy";
import { loadDefaultFeePolicy, loadDefaultPlateRegions } from "./yaml-defaults";
import {
  getFeePolicy,
  resetPolicyStoreForTests,
  setPolicyOverrideForTests,
} from "./policy-store";

describe("yaml defaults", () => {
  it("loads registration tax percents from fee-policy.yml", () => {
    const policy = loadDefaultFeePolicy();
    expect(policy.registrationTaxPercent).toBe(10);
    expect(policy.registrationTaxCommercialPercent).toBe(2);
  });

  it("loads Hanoi plate fee as AREA_I amount", () => {
    const regions = loadDefaultPlateRegions();
    expect(plateAmountForLocation(regions, "HN")).toBe(20_000_000);
    expect(plateAmountForLocation(regions, "HP")).toBe(200_000);
  });
});

describe("policy store", () => {
  it("prefers app_settings override over YAML default", async () => {
    resetPolicyStoreForTests();
    setPolicyOverrideForTests("feePolicy", {
      registrationTaxPercent: 12,
      registrationTaxCommercialPercent: 3,
    });

    const policy = await getFeePolicy();
    expect(policy.registrationTaxPercent).toBe(12);
    expect(policy.registrationTaxCommercialPercent).toBe(3);
  });

  it("falls back to YAML when no override exists", async () => {
    resetPolicyStoreForTests();
    const policy = await getFeePolicy();
    expect(policy.registrationTaxPercent).toBe(10);
  });
});

describe("fee policy math", () => {
  it("calculates registration tax from selling price", () => {
    const feePolicy = loadDefaultFeePolicy();
    const plateRegions = loadDefaultPlateRegions();
    const amount = policyFeeAmount(
      "REGISTRATION_TAX",
      500_000_000,
      "PRIVATE",
      { code: "HN" },
      feePolicy,
      plateRegions,
    );
    expect(amount).toBe(50_000_000);
    expect(registrationTaxPercent(feePolicy, "COMMERCIAL")).toBe(2);
  });
});
