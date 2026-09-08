import { describe, expect, it } from "vitest";
import { colorGridCellRects, colorGridRows, orderedReportColors } from "@onroad/shared/quote/colorGridLayout";

describe("orderedReportColors", () => {
  it("keeps dealer slot order and appends extras", () => {
    expect(orderedReportColors(["Đỏ", "Trắng", "Bạc"])).toEqual(["Bạc", "Trắng", "Đỏ"]);
  });

  it("caps at six colors", () => {
    expect(orderedReportColors(["A", "B", "C", "D", "E", "F", "G"])).toHaveLength(6);
  });
});

describe("colorGridRows", () => {
  it("uses one full cell for a single photo", () => {
    expect(colorGridRows(1)).toEqual([[0]]);
  });

  it("uses two columns for three photos", () => {
    expect(colorGridRows(3)).toEqual([[0, 1], [2]]);
  });

  it("uses two columns for four photos", () => {
    expect(colorGridRows(4)).toEqual([[0, 1], [2, 3]]);
  });

  it("uses two columns and three rows for six photos", () => {
    expect(colorGridRows(6)).toEqual([[0, 1], [2, 3], [4, 5]]);
  });

  it("centers the last row when there are five photos", () => {
    expect(colorGridRows(5)).toEqual([[0, 1], [2, 3], [4]]);
  });
});

describe("colorGridCellRects", () => {
  it("centers a single photo in the canvas", () => {
    const [rect] = colorGridCellRects(1, 500, 300, 0);
    expect(rect).toEqual({ left: 0, top: 0, width: 500, height: 300 });
  });

  it("centers the last row when there are five photos", () => {
    const rects = colorGridCellRects(5, 600, 300, 0);
    expect(rects[4]?.left).toBe(150);
    expect(rects[3]?.left).toBe(300);
  });
});
