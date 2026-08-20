import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadCategoryCache,
  loadLocationCache,
  saveCategoryCache,
  saveLocationCache,
} from "./catalogReferenceCache";

function mockSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
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
  };
  vi.stubGlobal("sessionStorage", sessionStorage);
  return store;
}

describe("catalogReferenceCache", () => {
  beforeEach(() => {
    mockSessionStorage();
  });

  it("round-trips categories", () => {
    const categories = [
      {
        id: 1,
        code: "SEDAN",
        name: "Sedan",
        description: "",
        typicalSeats: 5,
        requiresInspection: false,
        requiresRoadUseFee: false,
        requiresCompulsoryInsurance: false,
      },
    ];
    saveCategoryCache(categories);
    expect(loadCategoryCache()).toEqual(categories);
  });

  it("round-trips locations", () => {
    const locations = [
      {
        id: 1,
        code: "HN",
        name: "Hà Nội",
        nameEn: "Hanoi",
        nameZh: "河内",
        nameJa: "ハノイ",
        region: "NORTH",
        feeZone: "AREA_I",
        centrallyGovernedCity: true,
      },
    ];
    saveLocationCache(locations);
    expect(loadLocationCache()).toEqual(locations);
  });
});
