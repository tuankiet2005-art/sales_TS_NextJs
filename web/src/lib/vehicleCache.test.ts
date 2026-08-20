import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadVehicleCache, saveVehicleCache, vehicleCacheKey } from "./vehicleCache";

function mockSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe("vehicleCache", () => {
  beforeEach(() => {
    mockSessionStorage();
  });

  it("round-trips vehicle detail in sessionStorage", () => {
    const vehicle = {
      id: 5,
      name: "Attrage",
      model: "Attrage",
      brandName: "Mitsubishi",
      listPrice: 400,
      salePrice: 380,
      discountAmount: 20,
      taxBasePrice: 400,
      engineCc: 1200,
      defaultDeposit: 0,
      registrationServiceFee: 0,
      micaPlateFee: 0,
      inspectionFee: 0,
      categoryId: 4,
      categoryName: "Sedan",
      imageUrl: null,
    };
    saveVehicleCache(5, vehicle);
    expect(sessionStorage.getItem(vehicleCacheKey(5))).toBeTruthy();
    expect(loadVehicleCache(5)).toEqual(vehicle);
  });

  it("returns null for missing cache", () => {
    expect(loadVehicleCache(99)).toBeNull();
  });
});
