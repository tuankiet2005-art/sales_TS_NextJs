import { describe, expect, it } from "vitest";

import { webpFileName } from "./convertImageToWebp";

describe("webpFileName", () => {
  it("replaces the original extension with .webp", () => {
    expect(webpFileName("TRITON PRE TRẮNG.jpg")).toBe("TRITON PRE TRẮNG.webp");
  });

  it("falls back to image.webp when the source has no extension", () => {
    expect(webpFileName("photo")).toBe("photo.webp");
  });
});
