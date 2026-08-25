import { describe, expect, it, vi } from "vitest";

import { extrasFromQuote, extrasFromVehicle, loadExtras } from "./quoteExtras";
import type { CostBreakdown, VehicleDetail } from "../types";

const vehicle = {
  listPrice: 380_000_000,
  discountAmount: 19_000_000,
  defaultDeposit: 20_000_000,
  registrationServiceFee: 5_000_000,
  micaPlateFee: 0,
  inspectionFee: 140_000,
} as VehicleDetail;

const breakdown = {
  discountAmount: 34_000_000,
} as CostBreakdown;

describe("quoteExtras", () => {
  it("seeds discount from vehicle catalog pricing", () => {
    expect(extrasFromVehicle(vehicle).listPrice).toBe(380_000_000);
    expect(extrasFromVehicle(vehicle).discountAmount).toBe(19_000_000);
  });

  it("prefers breakdown discount when seeding quote extras", () => {
    expect(extrasFromQuote(vehicle, breakdown).discountAmount).toBe(34_000_000);
  });

  it("seeds adjustable fees from breakdown", () => {
    const fullBreakdown = {
      ...breakdown,
      fees: [
        { code: "REGISTRATION_TAX", amount: 38_000_000 },
        { code: "LICENSE_PLATE", amount: 20_000_000 },
        { code: "REGISTRATION_SERVICE", amount: 3_000_000 },
        { code: "INSPECTION", amount: 90_000 },
        { code: "ROAD_USE", amount: 1_560_000 },
        { code: "COMPULSORY_INSURANCE", amount: 480_700 },
        { code: "OPTIONAL_BODY_INSURANCE", amount: 0 },
      ],
    } as CostBreakdown;

    const extras = extrasFromQuote(vehicle, fullBreakdown);
    expect(extras.registrationTax).toBe(38_000_000);
    expect(extras.licensePlateFee).toBe(20_000_000);
    expect(extras.registrationServiceFee).toBe(3_000_000);
    expect(extras.inspectionFee).toBe(90_000);
    expect(extras.roadUseFee).toBe(1_560_000);
    expect(extras.compulsoryInsurance).toBe(480_700);
    expect(extras.optionalBodyInsurance).toBe(0);
  });

  it("keeps fallback discount when stored extras omit it", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    store.set("onroad-extras-42", JSON.stringify({ deposit: 10_000_000, accessories: [] }));
    const loaded = loadExtras(42, extrasFromQuote(vehicle, breakdown));
    expect(loaded.discountAmount).toBe(34_000_000);
    expect(loaded.deposit).toBe(10_000_000);
    vi.unstubAllGlobals();
  });
});
