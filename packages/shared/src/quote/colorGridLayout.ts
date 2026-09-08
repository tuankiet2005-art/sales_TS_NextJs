/** Preferred paint order on the dealer quote sheet (extras follow in catalog order). */
export const REPORT_COLOR_SLOT_ORDER = ["Bạc", "Nâu", "Đen", "Trắng"] as const;

const MAX_REPORT_COLORS = 5;

/** Up to five color names in dealer slot order, then any extras from the catalog. */
export function orderedReportColors(colorNames: string[]): string[] {
  const available = colorNames.map((name) => name.trim()).filter(Boolean);
  const set = new Set(available);
  const ordered: string[] = [];

  for (const slot of REPORT_COLOR_SLOT_ORDER) {
    if (set.has(slot)) {
      ordered.push(slot);
    }
  }
  for (const name of available) {
    if (
      !REPORT_COLOR_SLOT_ORDER.includes(name as (typeof REPORT_COLOR_SLOT_ORDER)[number]) &&
      !ordered.includes(name)
    ) {
      ordered.push(name);
    }
  }

  return ordered.slice(0, MAX_REPORT_COLORS);
}

/** Row-major photo indices; shorter rows are centered in the widest row. */
export function colorGridRows(count: number): number[][] {
  switch (count) {
    case 1:
      return [[0]];
    case 2:
      return [[0, 1]];
    case 3:
      return [[0, 1, 2]];
    case 4:
      return [
        [0, 1],
        [2, 3],
      ];
    case 5:
      return [
        [0, 1, 2],
        [3, 4],
      ];
    default:
      return [];
  }
}

export type ColorGridCellRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Pixel rectangles for compositing report color photos into one image. */
export function colorGridCellRects(
  count: number,
  canvasWidth: number,
  canvasHeight: number,
  padding = 8,
): ColorGridCellRect[] {
  const rows = colorGridRows(count);
  if (!rows.length) {
    return [];
  }

  const maxCols = Math.max(...rows.map((row) => row.length));
  const rowHeight = canvasHeight / rows.length;
  const cellWidth = canvasWidth / maxCols;
  const rects: ColorGridCellRect[] = [];

  rows.forEach((row, rowIndex) => {
    const rowWidth = cellWidth * row.length;
    const startX = (canvasWidth - rowWidth) / 2;
    row.forEach((photoIndex, colIndex) => {
      rects[photoIndex] = {
        left: Math.round(startX + colIndex * cellWidth + padding),
        top: Math.round(rowIndex * rowHeight + padding),
        width: Math.round(cellWidth - padding * 2),
        height: Math.round(rowHeight - padding * 2),
      };
    });
  });

  return rects;
}
