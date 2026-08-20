import { describe, expect, it } from "vitest";

import {
  extractColorFromFilename,
  groupImagesByTrim,
  normalizeColorToken,
  parseImageRecord,
  resolveTrimName,
} from "./vehicle-import";

describe("vehicle-import color parsing", () => {
  it("maps Triton Premium white from filename", () => {
    expect(extractColorFromFilename("TRITON PRE TRẮNG.jpg", "TRITON", "PREMIUM")).toBe("Trắng");
  });

  it("maps Xforce Ultimate two-tone colors", () => {
    expect(extractColorFromFilename("XFORCE P2 TRẮNG ĐEN.jpg", "XFORCE", "ULTIMATE")).toBe(
      "Trắng Đen",
    );
    expect(extractColorFromFilename("XFORCE P2 VÀNG ĐEN.jpg", "XFORCE", "ULTIMATE")).toBe(
      "Vàng Đen",
    );
  });

  it("handles extra whitespace in Destinator Ultimate filenames", () => {
    expect(extractColorFromFilename("DST  P2 XANH ĐEN.jpg", "DESTINATOR", "ULTIMATE")).toBe(
      "Xanh Đen",
    );
  });

  it("normalizes single Vietnamese color tokens", () => {
    expect(normalizeColorToken("cam")).toBe("Cam");
    expect(normalizeColorToken("ĐỎ")).toBe("Đỏ");
  });

  it("resolves folder version folders to catalog trim names", () => {
    expect(resolveTrimName("ATTRAGE", "PREMIUM")).toBe("Attrage CVT Premium");
    expect(resolveTrimName("XPANDER", "ECO")).toBe("Xpander Eco");
  });
});

describe("vehicle-import grouping", () => {
  it("groups parsed images by trim", () => {
    const rootDir = "/tmp/root";
    const parsed = [
      parseImageRecord(`${rootDir}/XPANDER/ECO/XPANDER ECO TRẮNG.jpg`, rootDir),
      parseImageRecord(`${rootDir}/XPANDER/ECO/XPANDER ECO ĐEN.jpg`, rootDir),
    ];
    const grouped = groupImagesByTrim(parsed);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].trimName).toBe("Xpander Eco");
    expect(grouped[0].images).toHaveLength(2);
    expect(grouped[0].availableColors).toContain("Trắng");
  });
});
