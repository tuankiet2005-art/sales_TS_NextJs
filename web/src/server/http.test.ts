import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import { CATALOG_LIST_CACHE_CONTROL, json } from "./http";

describe("json", () => {
  it("sets catalog Cache-Control when headers are passed", () => {
    const response = json({ ok: true }, 200, { "Cache-Control": CATALOG_LIST_CACHE_CONTROL });
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
  });
});
