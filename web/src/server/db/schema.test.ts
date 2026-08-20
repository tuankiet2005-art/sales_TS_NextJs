import { describe, expect, it } from "vitest";

import { hasDatabaseUrl } from "./client";
import { findActiveVehicleById } from "./repositories/catalog";

describe("catalog repository", () => {
  it.skipIf(!hasDatabaseUrl())("returns an active vehicle by id from Neon", async () => {
    const row = await findActiveVehicleById(1);
    expect(row).not.toBeNull();
    expect(row?.vehicle.active).toBe(true);
    expect(row?.brand.code).toBeTruthy();
  });
});
