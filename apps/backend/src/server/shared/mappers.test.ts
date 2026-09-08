import { describe, expect, it } from "vitest";

import type { DealerPolicyRecord } from "./config/types";
import { mapVehicleSummaryWithPolicy } from "./mappers";

const policy: DealerPolicyRecord = {
  privateDiscountPercent: 5,
  commercialDiscountPercent: 8,
  offers: [],
};

const row = {
  vehicle: {
    id: 1,
    listPrice: "490000000",
    discountAmount: "59000000",
    salePrice: "431000000",
    modelYear: 2024,
    model: "Attrage",
    name: "Attrage CVT Premium",
    seats: 5,
    vehicleType: "ICE",
    imageUrl: "",
  },
  brand: {
    id: 1,
    code: "mitsubishi",
    name: "MITSUBISHI",
    tagline: null,
    market: "VN",
    accentColor: null,
    imageUrl: null,
    ready: true,
  },
  category: {
    id: 3,
    code: "PASSENGER_CAR_4",
    name: "4 seats",
    description: null,
    typicalSeats: 4,
    requiresInspection: false,
    requiresRoadUseFee: false,
    requiresCompulsoryInsurance: false,
    sortOrder: 0,
  },
};

describe("mapVehicleSummaryWithPolicy", () => {
  it("uses dealer policy percent instead of legacy DB discount columns", () => {
    const summary = mapVehicleSummaryWithPolicy(row, policy);
    expect(summary.discountAmount).toBe(24_500_000);
    expect(summary.salePrice).toBe(465_500_000);
    expect(summary.listPrice).toBe(490_000_000);
  });
});
