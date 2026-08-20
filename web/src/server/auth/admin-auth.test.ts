import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isAuthorizedAdmin, loginAdmin } from "./admin-auth";

const KEYS = ["ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_TOKEN_SECRET"] as const;

describe("loginAdmin", () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      previous[key] = process.env[key];
    }
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "Admin!!@";
    process.env.ADMIN_TOKEN_SECRET = "test-token-secret";
  });

  afterEach(() => {
    for (const key of KEYS) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("returns a bearer token for the configured operator credentials", () => {
    const token = loginAdmin("admin", "Admin!!@");
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(isAuthorizedAdmin(`Bearer ${token}`)).toBe(true);
  });

  it("rejects the wrong password", () => {
    expect(loginAdmin("admin", "Admin!!")).toBeNull();
  });

  it("matches credentials after trimming submitted username and password", () => {
    const token = loginAdmin("  admin  ", "  Admin!!@  ");
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });
});
