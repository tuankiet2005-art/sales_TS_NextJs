import { describe, expect, it } from "vitest";

import { isPublicApiPath } from "./adminAuth";

describe("isPublicApiPath", () => {
  it("treats catalog and reference reads as public", () => {
    expect(isPublicApiPath("/api/brands")).toBe(true);
    expect(isPublicApiPath("/api/brands/MITSUBISHI")).toBe(true);
    expect(isPublicApiPath("/api/vehicles/search?page=1")).toBe(true);
    expect(isPublicApiPath("/api/vehicle-categories")).toBe(true);
    expect(isPublicApiPath("/api/catalog?brand=MITSUBISHI")).toBe(true);
  });

  it("requires auth for operator quote routes", () => {
    expect(isPublicApiPath("/api/quotes")).toBe(false);
    expect(isPublicApiPath("/api/quotes/5")).toBe(false);
    expect(isPublicApiPath("/api/calculate-on-road-cost")).toBe(false);
    expect(isPublicApiPath("/api/export-quote")).toBe(false);
    expect(isPublicApiPath("/api/admin/brands")).toBe(false);
  });
});
