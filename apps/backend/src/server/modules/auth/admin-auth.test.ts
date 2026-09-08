import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  isAuthorizedAdmin,
  isAuthorizedOperator,
  login,
  loginAdmin,
  resolveSession,
} from "./admin-auth";

const KEYS = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_TOKEN_SECRET",
  "OPERATOR_USERNAME",
  "OPERATOR_PASSWORD",
] as const;

describe("login", () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      previous[key] = process.env[key];
    }
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "Admin!!@";
    process.env.ADMIN_TOKEN_SECRET = "test-token-secret";
    delete process.env.OPERATOR_USERNAME;
    delete process.env.OPERATOR_PASSWORD;
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

  it("returns an admin bearer token for configured admin credentials", () => {
    const session = login("admin", "Admin!!@");
    expect(session).not.toBeNull();
    expect(session?.role).toBe("admin");
    expect(session?.token).toMatch(/^[a-f0-9]{64}$/);
    expect(isAuthorizedAdmin(`Bearer ${session?.token}`)).toBe(true);
    expect(isAuthorizedOperator(`Bearer ${session?.token}`)).toBe(true);
  });

  it("rejects the wrong password", () => {
    expect(login("admin", "Admin!!")).toBeNull();
  });

  it("matches credentials after trimming submitted username and password", () => {
    const session = login("  admin  ", "  Admin!!@  ");
    expect(session?.token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("issues a sales token for operator credentials when configured", () => {
    process.env.OPERATOR_USERNAME = "sales";
    process.env.OPERATOR_PASSWORD = "Sales!!@";
    const session = login("sales", "Sales!!@");
    expect(session?.role).toBe("sales");
    expect(isAuthorizedOperator(`Bearer ${session?.token}`)).toBe(true);
    expect(isAuthorizedAdmin(`Bearer ${session?.token}`)).toBe(false);
  });

  it("keeps loginAdmin compatibility", () => {
    const token = loginAdmin("admin", "Admin!!@");
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("resolveSession returns username and role", () => {
    const session = login("admin", "Admin!!@");
    expect(resolveSession(`Bearer ${session?.token}`)).toEqual({
      username: "admin",
      role: "admin",
    });
  });
});
