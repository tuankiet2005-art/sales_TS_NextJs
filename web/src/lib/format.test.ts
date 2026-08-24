import { describe, expect, it } from "vitest";

import {
  formatMoneyColumn,
  formatQuoteAmount,
  formatVnd,
  isMoneyField,
  parseMoneyInput,
} from "./format";

describe("formatVnd", () => {
  it("formats whole VND amounts with the locale currency symbol", () => {
    expect(formatVnd(599_000_000)).toMatch(/599\.000\.000/);
    expect(formatVnd(599_000_000)).toMatch(/₫|đ/i);
  });

  it("accepts numeric strings", () => {
    expect(formatVnd("1500000")).toMatch(/1\.500\.000/);
  });
});

describe("formatQuoteAmount", () => {
  it("groups digits without a currency symbol", () => {
    expect(formatQuoteAmount(1_500_000)).toBe("1.500.000");
    expect(formatQuoteAmount(1_500_000)).not.toMatch(/₫|đ/i);
  });

  it("returns empty for blank input", () => {
    expect(formatQuoteAmount(null)).toBe("");
    expect(formatQuoteAmount(undefined)).toBe("");
  });
});

describe("parseMoneyInput", () => {
  it("strips grouping and currency symbols", () => {
    expect(parseMoneyInput("599.000.000 ₫")).toBe(599_000_000);
    expect(parseMoneyInput("1,500,000")).toBe(1_500_000);
  });

  it("returns undefined for empty input", () => {
    expect(parseMoneyInput("")).toBeUndefined();
    expect(parseMoneyInput("   ")).toBeUndefined();
  });
});

describe("isMoneyField", () => {
  it("marks known money keys", () => {
    expect(isMoneyField("listPrice")).toBe(true);
    expect(isMoneyField("fixedAmount")).toBe(true);
    expect(isMoneyField("percentage")).toBe(false);
  });
});

describe("formatMoneyColumn", () => {
  it("formats money columns and ignores others", () => {
    expect(formatMoneyColumn("listPrice", 100_000_000)).toMatch(/100\.000\.000/);
    expect(formatMoneyColumn("percentage", 10)).toBeNull();
  });
});
