import { describe, expect, it } from "vitest";

import {
  collapseRecentDuplicateQuotes,
  isListableHistoryRow,
  shouldReuseRecentQuote,
} from "./quote-history-rules";

function row(overrides: {
  id: number;
  customerName?: string;
  vehicleId?: number;
  vehicleName?: string;
  onRoadTotal?: number;
  createdAt: string;
}) {
  return {
    customerName: "Đặng Xuân Hinh",
    vehicleId: 4,
    vehicleName: "Attrage CVT",
    onRoadTotal: 481_958_200,
    ...overrides,
  };
}

describe("quote history reuse", () => {
  it("reuses a complete quote for the same customer, vehicle, and total within two minutes", () => {
    const recent = { onRoadTotal: 481_958_200, createdAt: "2026-08-20T09:12:00.000Z" };
    expect(shouldReuseRecentQuote(recent, 481_958_200, new Date("2026-08-20T09:13:30.000Z"))).toBe(true);
  });

  it("does not reuse when the on-road total differs (empty PDF stub vs Excel row)", () => {
    const recent = { onRoadTotal: 481_958_200, createdAt: "2026-08-20T09:12:00.000Z" };
    expect(shouldReuseRecentQuote(recent, 0, new Date("2026-08-20T09:12:05.000Z"))).toBe(false);
  });

  it("does not reuse a quote older than two minutes", () => {
    const recent = { onRoadTotal: 481_958_200, createdAt: "2026-08-20T09:12:00.000Z" };
    expect(shouldReuseRecentQuote(recent, 481_958_200, new Date("2026-08-20T09:15:00.000Z"))).toBe(false);
  });
});

describe("quote history listing", () => {
  it("hides incomplete export stubs with no vehicle and a zero total", () => {
    expect(isListableHistoryRow({ vehicleName: "", onRoadTotal: 0 })).toBe(false);
    expect(isListableHistoryRow({ vehicleName: "Attrage CVT", onRoadTotal: 481_958_200 })).toBe(true);
  });

  it("shows one row when Excel and PDF saved the same quote a few seconds apart", () => {
    const visible = collapseRecentDuplicateQuotes([
      row({ id: 2, createdAt: "2026-08-20T09:12:08.000Z" }),
      row({ id: 1, createdAt: "2026-08-20T09:12:03.000Z" }),
    ]);
    expect(visible.map((item) => item.id)).toEqual([2]);
  });

  it("drops the empty PDF stub next to a complete Excel row", () => {
    const visible = collapseRecentDuplicateQuotes([
      row({ id: 2, vehicleName: "", onRoadTotal: 0, createdAt: "2026-08-20T09:12:08.000Z" }),
      row({ id: 1, createdAt: "2026-08-20T09:12:03.000Z" }),
    ]);
    expect(visible.map((item) => item.id)).toEqual([1]);
  });
});
