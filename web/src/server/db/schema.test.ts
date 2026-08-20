import { describe, expect, it } from "vitest";

import { hasDatabaseUrl, normalizeDatabaseUrl } from "./client";
import { findActiveVehicleById } from "./repositories/catalog";

describe("normalizeDatabaseUrl", () => {
  it("strips wrapping quotes and jdbc prefix", () => {
    expect(normalizeDatabaseUrl('"postgresql://user:pass@host/db"')).toBe(
      "postgresql://user:pass@host/db"
    );
    expect(normalizeDatabaseUrl("jdbc:postgresql://user:pass@host/db")).toBe(
      "postgresql://user:pass@host/db"
    );
  });
});

describe("catalog repository", () => {
  it.skipIf(!hasDatabaseUrl())("returns an active vehicle by id from Neon", async () => {
    const row = await findActiveVehicleById(1);
    expect(row).not.toBeNull();
    expect(row?.vehicle.active).toBe(true);
    expect(row?.brand.code).toBeTruthy();
  });
});
