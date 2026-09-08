import { describe, expect, it } from "vitest";

import {
  quoteCellInnerStyle,
  quoteCellSpannedHeight,
  quoteCellTextAlign,
  quoteCellTextStyle,
  quoteCellVerticalAlign,
  quoteSheetCaptureSize,
} from "./quoteSheetCellLayout";

describe("quoteCellTextAlign", () => {
  it("keeps Excel center and right", () => {
    expect(quoteCellTextAlign("center", "abc")).toBe("center");
    expect(quoteCellTextAlign("right", "abc")).toBe("right");
  });

  it("right-aligns numeric amounts", () => {
    expect(quoteCellTextAlign("left", "1.250.000")).toBe("right");
  });
});

describe("quoteCellSpannedHeight", () => {
  it("sums row heights for a rowspan", () => {
    expect(quoteCellSpannedHeight([20, 24, 30, 18], 1, 2)).toBe(54);
  });
});

describe("quoteCellVerticalAlign", () => {
  it("defaults to middle", () => {
    expect(quoteCellVerticalAlign(undefined)).toBe("middle");
    expect(quoteCellVerticalAlign("center")).toBe("middle");
  });
});

describe("quoteCellInnerStyle", () => {
  it("uses an explicit-height table box for rowspan merges", () => {
    const style = quoteCellInnerStyle("center", "pre-wrap", 78, 2, "middle");
    expect(style.display).toBe("table");
    expect(style.height).toBe(78);
  });

  it("keeps single-row cells in normal block flow", () => {
    const style = quoteCellInnerStyle("right", "nowrap", 25, 1, "middle");
    expect(style.display).toBe("block");
    expect(style.height).toBeUndefined();
  });
});

describe("quoteCellTextStyle", () => {
  it("table-cells wrapped text inside rowspan merges", () => {
    const style = quoteCellTextStyle("center", "pre-wrap", 2, "middle");
    expect(style?.display).toBe("table-cell");
    expect(style?.verticalAlign).toBe("middle");
  });
});

describe("quoteSheetCaptureSize", () => {
  it("uses the named sheet box when it is the largest", () => {
    expect(
      quoteSheetCaptureSize({
        dataset: { quoteWidth: "1099", quoteHeight: "1600" },
        offsetWidth: 400,
        offsetHeight: 500,
        scrollWidth: 400,
        scrollHeight: 500,
      }),
    ).toEqual({ width: 1099, height: 1600 });
  });

  it("grows to scroll size so capture does not crop overflowing content", () => {
    expect(
      quoteSheetCaptureSize({
        dataset: { quoteWidth: "800", quoteHeight: "600" },
        offsetWidth: 800,
        offsetHeight: 600,
        scrollWidth: 800,
        scrollHeight: 900,
      }),
    ).toEqual({ width: 800, height: 900 });
  });
});
