import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = vi.hoisted(() => ({
  findActiveVehicleById: vi.fn(),
  findBrandByCode: vi.fn(),
  findCategoryById: vi.fn(),
  findLocationById: vi.fn(),
  listActiveFeeDefinitions: vi.fn(async () => []),
  listActiveFeeRules: vi.fn(async () => []),
  listBrands: vi.fn(),
  listCategories: vi.fn(),
  listLocations: vi.fn(),
  searchActiveVehicles: vi.fn(),
}));

vi.mock("../db/repositories/catalog", () => catalog);

vi.mock("../config/policy-store", () => ({
  loadPolicySnapshot: vi.fn(async () => ({
    feePolicy: {
      registrationTaxPercent: 10,
      registrationTaxCommercialPercent: 2,
    },
    plateRegions: {},
    dealerPolicy: {
      privateDiscountPercent: 0,
      commercialDiscountPercent: 0,
      offers: [],
    },
  })),
  getFeePolicy: vi.fn(async () => ({
    registrationTaxPercent: 10,
    registrationTaxCommercialPercent: 2,
  })),
  getPlateRegions: vi.fn(async () => ({})),
  getDealerPolicy: vi.fn(async () => ({
    privateDiscountPercent: 0,
    commercialDiscountPercent: 0,
    offers: [],
  })),
}));

import {
  calculateOnRoad,
  getCatalogBootstrap,
  getCategories,
  invalidateCatalogCache,
  resetCatalogCacheForTests,
  resolveQuoteCalculation,
} from "./catalog-service";

const categoryRow = {
  id: 4,
  code: "SEDAN",
  name: "Sedan",
  description: null,
  typicalSeats: 5,
  requiresInspection: false,
  requiresRoadUseFee: false,
  requiresCompulsoryInsurance: false,
  sortOrder: 0,
};

describe("catalog list cache", () => {
  beforeEach(() => {
    resetCatalogCacheForTests();
    catalog.listCategories.mockReset();
    catalog.listCategories.mockResolvedValue([categoryRow]);
  });

  it("does not list categories again for a second getCategories call", async () => {
    const first = await getCategories();
    const second = await getCategories();
    expect(first).toEqual(second);
    expect(catalog.listCategories).toHaveBeenCalledTimes(1);
  });

  it("lists categories again after invalidateCatalogCache", async () => {
    await getCategories();
    invalidateCatalogCache();
    await getCategories();
    expect(catalog.listCategories).toHaveBeenCalledTimes(2);
  });
});

describe("calculateOnRoad lookups", () => {
  beforeEach(() => {
    resetCatalogCacheForTests();
    catalog.findActiveVehicleById.mockReset();
    catalog.findLocationById.mockReset();
    catalog.findCategoryById.mockReset();
    catalog.listActiveFeeDefinitions.mockReset();
    catalog.listActiveFeeRules.mockReset();
    catalog.listActiveFeeDefinitions.mockResolvedValue([]);
    catalog.listActiveFeeRules.mockResolvedValue([]);
  });

  it("starts the location lookup before the vehicle lookup resolves", async () => {
    let releaseVehicle!: (value: null) => void;
    const vehicleGate = new Promise<null>((resolve) => {
      releaseVehicle = resolve;
    });
    catalog.findActiveVehicleById.mockReturnValue(vehicleGate);

    let locationStarted = false;
    catalog.findLocationById.mockImplementation(async () => {
      locationStarted = true;
      return null;
    });

    const pending = calculateOnRoad({ vehicleId: 13, locationId: 29 });
    await Promise.resolve();
    await Promise.resolve();
    expect(locationStarted).toBe(true);

    releaseVehicle(null);
    await expect(pending).resolves.toBeNull();
  });

  it("returns null when the vehicle is missing", async () => {
    catalog.findActiveVehicleById.mockResolvedValue(null);
    catalog.findLocationById.mockResolvedValue({
      id: 29,
      code: "AG",
      name: "An Giang",
      nameEn: "An Giang",
      nameZh: "An Giang",
      nameJa: "An Giang",
      region: "SOUTH",
      feeZone: "AREA_II",
      centrallyGovernedCity: false,
    });
    await expect(calculateOnRoad({ vehicleId: 13, locationId: 29 })).resolves.toBeNull();
  });

  it("returns a location error when the location is missing", async () => {
    catalog.findActiveVehicleById.mockResolvedValue({
      vehicle: {
        id: 13,
        listPrice: "100",
        taxBasePrice: "100",
        engineCc: 1200,
        defaultDeposit: "0",
        registrationServiceFee: "0",
        micaPlateFee: "0",
        inspectionFee: "0",
        name: "Attrage",
        model: "Attrage",
      },
      brand: { name: "Mitsubishi" },
      category: categoryRow,
    });
    catalog.findLocationById.mockResolvedValue(null);
    await expect(calculateOnRoad({ vehicleId: 13, locationId: 29 })).resolves.toEqual({ error: "location" });
  });

  it("uses findCategoryById when categoryId is set", async () => {
    catalog.findActiveVehicleById.mockResolvedValue(null);
    catalog.findLocationById.mockResolvedValue(null);
    catalog.findCategoryById.mockResolvedValue(categoryRow);
    await calculateOnRoad({ vehicleId: 13, locationId: 29, categoryId: 4 });
    expect(catalog.findCategoryById).toHaveBeenCalledWith(4);
  });

  it("does not call findCategoryById when categoryId is omitted", async () => {
    catalog.findActiveVehicleById.mockResolvedValue(null);
    catalog.findLocationById.mockResolvedValue(null);
    await calculateOnRoad({ vehicleId: 13, locationId: 29 });
    expect(catalog.findCategoryById).not.toHaveBeenCalled();
  });
});

describe("resolveQuoteCalculation", () => {
  const vehicleRow = {
    vehicle: {
      id: 13,
      listPrice: "100",
      taxBasePrice: "100",
      engineCc: 1200,
      defaultDeposit: "0",
      registrationServiceFee: "0",
      micaPlateFee: "0",
      inspectionFee: "0",
      name: "Attrage",
      model: "Attrage",
    },
    brand: { name: "Mitsubishi", code: "mitsubishi" },
    category: categoryRow,
  };

  const breakdown = {
    vehicleId: 13,
    listPrice: 100,
    salePrice: 100,
    totalOnRoad: 120,
    fees: [],
    accessories: [],
    deposit: 0,
    balanceDue: 120,
  };

  beforeEach(() => {
    resetCatalogCacheForTests();
    catalog.findActiveVehicleById.mockReset();
    catalog.findLocationById.mockReset();
    catalog.findCategoryById.mockReset();
    catalog.listActiveFeeDefinitions.mockReset();
    catalog.listActiveFeeRules.mockReset();
    catalog.listActiveFeeDefinitions.mockResolvedValue([]);
    catalog.listActiveFeeRules.mockResolvedValue([]);
  });

  it("reuses client breakdown when vehicleId matches", async () => {
    catalog.findActiveVehicleById.mockResolvedValue(vehicleRow);
    const result = await resolveQuoteCalculation({ vehicleId: 13, locationId: 29 }, breakdown);
    expect(result).toEqual({ data: breakdown, vehicleRow });
    expect(catalog.findLocationById).not.toHaveBeenCalled();
  });

  it("falls back to calculateOnRoad when breakdown vehicleId mismatches", async () => {
    catalog.findActiveVehicleById.mockResolvedValue(null);
    catalog.findLocationById.mockResolvedValue(null);
    await resolveQuoteCalculation({ vehicleId: 13, locationId: 29 }, { ...breakdown, vehicleId: 99 });
    expect(catalog.findLocationById).toHaveBeenCalled();
  });
});

describe("getCatalogBootstrap", () => {
  beforeEach(() => {
    resetCatalogCacheForTests();
    catalog.findBrandByCode.mockReset();
    catalog.listCategories.mockReset();
    catalog.searchActiveVehicles.mockReset();
    catalog.listCategories.mockResolvedValue([categoryRow]);
    catalog.searchActiveVehicles.mockResolvedValue([]);
  });

  it("returns null when brand is missing", async () => {
    catalog.findBrandByCode.mockResolvedValue(null);
    await expect(getCatalogBootstrap("missing")).resolves.toBeNull();
  });

  it("bundles brand, categories, and vehicles", async () => {
    catalog.findBrandByCode.mockResolvedValue({
      id: 1,
      code: "mitsubishi",
      name: "Mitsubishi",
      logoUrl: null,
      sortOrder: 0,
    });
    const result = await getCatalogBootstrap("mitsubishi");
    expect(result?.brand.code).toBe("mitsubishi");
    expect(result?.categories).toHaveLength(1);
    expect(result?.vehicles).toEqual([]);
  });
});
