import type ExcelJS from "exceljs";

import { formatQuoteAmount } from "@/lib/format";
import type { QuoteSheetCellStyle, QuoteSheetView } from "@/lib/quoteSheetView";

import { evaluateSheetFormulas } from "./quote-sheet-formulas";
import { readCellText } from "./quote-sheet-fill";

const EMU_PER_PX = 9525;
const COLOR_HEADER = /các\s*màu\s*xe/i;
/** Bordered dealer table only — no spacer rows above or stray columns outside. */
const REPORT_FIRST_ROW = 3;
const REPORT_COL_COUNT = 7;

type MergeBox = { top: number; left: number; bottom: number; right: number };

export function worksheetToView(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet): QuoteSheetView {
  const reportLastRow = resolveReportLastRow(sheet);
  const merges = parseMerges(sheet).filter(
    (merge) =>
      merge.top <= reportLastRow &&
      merge.bottom >= REPORT_FIRST_ROW &&
      merge.left <= REPORT_COL_COUNT &&
      merge.right >= 1,
  );
  const columns = Array.from({ length: REPORT_COL_COUNT }, (_, i) => colWidthPx(sheet.getColumn(i + 1).width));
  const sheetRowHeights = Array.from({ length: reportLastRow }, (_, i) =>
    rowHeightPx(sheet.getRow(i + 1).height),
  );
  const clipTop = prefixSums(sheetRowHeights)[REPORT_FIRST_ROW - 1] ?? 0;
  const rows = sheetRowHeights.slice(REPORT_FIRST_ROW - 1, reportLastRow);
  const colStarts = prefixSums(columns);
  const sheetRowStarts = prefixSums(sheetRowHeights);
  const formulas = evaluateSheetFormulas(sheet);
  const mergeOrigin = new Map<string, MergeBox>();
  const covered = new Set<string>();
  for (const merge of merges) {
    const displayMerge = toDisplayMerge(merge);
    mergeOrigin.set(cellKey(displayMerge.top, displayMerge.left), displayMerge);
    for (let r = displayMerge.top; r <= displayMerge.bottom; r += 1) {
      for (let c = displayMerge.left; c <= displayMerge.right; c += 1) {
        if (r === displayMerge.top && c === displayMerge.left) {
          continue;
        }
        covered.add(cellKey(r, c));
      }
    }
  }

  const cells: QuoteSheetView["cells"] = [];
  for (let sheetR = REPORT_FIRST_ROW; sheetR <= reportLastRow; sheetR += 1) {
    const r = sheetR - REPORT_FIRST_ROW + 1;
    for (let c = 1; c <= REPORT_COL_COUNT; c += 1) {
      if (covered.has(cellKey(r, c))) {
        continue;
      }
      const merge = mergeOrigin.get(cellKey(r, c));
      const cell = sheet.getCell(sheetR, c);
      const value = formulas.valueAt(sheetR, c);
      const text = formatDisplay(cell, value);
      const style = mergedCellStyle(sheet, sheetR, c, merge);
      if (style.textAlign !== "center" && style.textAlign !== "right" && looksNumeric(text)) {
        style.textAlign = "right";
      }
      cells.push({
        r,
        c,
        text,
        colspan: merge ? merge.right - merge.left + 1 : undefined,
        rowspan: merge ? merge.bottom - merge.top + 1 : undefined,
        style,
      });
    }
  }

  collapseEmptyGiftRows(cells, rows, REPORT_FIRST_ROW);
  const rowStarts = prefixSums(rows);

  const colorHeaderRow = findColorHeaderRow(sheet);
  const colorGrid = findColorGridBox(sheet, merges, colStarts, rowStarts, columns, rows, REPORT_FIRST_ROW, colorHeaderRow);
  const images = sheetImages(
    workbook,
    sheet,
    REPORT_COL_COUNT,
    colStarts,
    sheetRowStarts,
    clipTop,
    rowStarts[rowStarts.length - 1] ?? 0,
    colorGrid,
    colorHeaderRow,
  );

  return {
    width: colStarts[REPORT_COL_COUNT] ?? 0,
    height: rowStarts[rowStarts.length - 1] ?? 0,
    columns,
    rows,
    cells,
    images,
    colorGrid,
  };
}

function toDisplayMerge(merge: MergeBox): MergeBox {
  return {
    top: merge.top - REPORT_FIRST_ROW + 1,
    left: Math.max(merge.left, 1),
    bottom: merge.bottom - REPORT_FIRST_ROW + 1,
    right: Math.min(merge.right, REPORT_COL_COUNT),
  };
}

function mergedCellStyle(
  sheet: ExcelJS.Worksheet,
  sheetR: number,
  sheetC: number,
  displayMerge?: MergeBox,
): QuoteSheetCellStyle {
  const style = cellStyle(sheet.getCell(sheetR, sheetC));
  if (!displayMerge) {
    return style;
  }
  const sheetBottom = REPORT_FIRST_ROW + displayMerge.bottom - 1;
  const sheetRight = displayMerge.right;
  const topLeft = cellStyle(sheet.getCell(sheetR, sheetC));
  const topRight = cellStyle(sheet.getCell(sheetR, sheetRight));
  const bottomLeft = cellStyle(sheet.getCell(sheetBottom, sheetC));
  const bottomRight = cellStyle(sheet.getCell(sheetBottom, sheetRight));
  return {
    ...style,
    borderTop: topLeft.borderTop ?? topRight.borderTop ?? style.borderTop,
    borderLeft: topLeft.borderLeft ?? bottomLeft.borderLeft ?? style.borderLeft,
    borderRight: topRight.borderRight ?? bottomRight.borderRight ?? style.borderRight,
    borderBottom: bottomLeft.borderBottom ?? bottomRight.borderBottom ?? style.borderBottom,
  };
}

function collapseEmptyGiftRows(cells: QuoteSheetView["cells"], rows: number[], firstSheetRow: number) {
  for (let sheetR = 13; sheetR <= 16; sheetR += 1) {
    const r = sheetR - firstSheetRow + 1;
    const hasGiftText = cells.some((cell) => cell.r === r && cell.c >= 4 && cell.text.trim().length > 0);
    const hasFeeText = cells.some((cell) => cell.r === r && cell.c <= 3 && cell.text.trim().length > 0);
    if (!hasGiftText && !hasFeeText) {
      rows[r - 1] = 2;
    }
  }
}

function resolveReportLastRow(sheet: ExcelJS.Worksheet) {
  let lastRow = Math.max(sheet.rowCount, REPORT_FIRST_ROW);
  for (const merge of parseMerges(sheet)) {
    if (merge.left <= REPORT_COL_COUNT && merge.right >= 1) {
      lastRow = Math.max(lastRow, merge.bottom);
    }
  }
  return lastRow;
}

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function parseMerges(sheet: ExcelJS.Worksheet): MergeBox[] {
  const ranges = (sheet.model as { merges?: string[] } | undefined)?.merges ?? [];
  return ranges.map((range) => {
    const [start, end] = range.split(":");
    const from = sheet.getCell(start);
    const to = sheet.getCell(end ?? start);
    return {
      top: Math.min(Number(from.row), Number(to.row)),
      left: Math.min(Number(from.col), Number(to.col)),
      bottom: Math.max(Number(from.row), Number(to.row)),
      right: Math.max(Number(from.col), Number(to.col)),
    };
  });
}

function colWidthPx(width?: number) {
  return Math.round((width ?? 9) * 7 + 5);
}

function rowHeightPx(height?: number) {
  return Math.round(((height ?? 15) * 96) / 72);
}

function prefixSums(sizes: number[]) {
  const out = [0];
  for (const size of sizes) {
    out.push(out[out.length - 1] + size);
  }
  return out;
}

function formatDisplay(cell: ExcelJS.Cell, value: number | string | Date | null) {
  if (value == null || value === "") {
    return "";
  }
  if (value instanceof Date) {
    return formatDate(value, cell.numFmt);
  }
  if (typeof value === "number") {
    return formatNumber(value, cell.numFmt);
  }
  return String(value);
}

function formatDate(value: Date, numFmt?: string) {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  if (numFmt && /d\/m\/yyyy/i.test(numFmt)) {
    return `${Number(day)}/${Number(month)}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

function looksNumeric(text: string) {
  return Boolean(text) && /^[\d.,\s]+$/.test(text);
}

function formatNumber(value: number, numFmt?: string) {
  if (numFmt && /#.*0/.test(numFmt)) {
    return formatQuoteAmount(Math.round(value));
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  const asText = String(Number(value.toPrecision(6)));
  return asText;
}

function cellStyle(cell: ExcelJS.Cell): QuoteSheetCellStyle {
  const font = cell.font ?? {};
  const alignment = cell.alignment ?? {};
  const fill = cell.fill as { pattern?: string; fgColor?: { argb?: string } } | undefined;
  const border = cell.border ?? {};
  const color = cssColor(font.color?.argb) ?? themeColor(font.color);
  return {
    background: fill?.pattern && fill.pattern !== "none" ? cssColor(fill.fgColor?.argb) : undefined,
    color,
    fontWeight: font.bold ? 700 : undefined,
    fontSize: font.size ? Math.round(font.size) : 14,
    fontFamily: "Times New Roman, Times, serif",
    fontStyle: font.italic ? "italic" : undefined,
    textAlign:
      alignment.horizontal === "center"
        ? "center"
        : alignment.horizontal === "right"
          ? "right"
          : "left",
    verticalAlign: alignment.vertical === "bottom" ? "bottom" : alignment.vertical === "top" ? "top" : "middle",
    whiteSpace: alignment.wrapText ? "pre-wrap" : "nowrap",
    borderTop: borderCss(border.top),
    borderRight: borderCss(border.right),
    borderBottom: borderCss(border.bottom),
    borderLeft: borderCss(border.left),
  };
}

function borderCss(side?: { style?: string; color?: { argb?: string } }) {
  if (!side?.style) {
    return undefined;
  }
  const width = side.style === "medium" || side.style === "thick" ? "2px" : "1px";
  return `${width} solid ${cssColor(side.color?.argb) ?? "#1f1f1f"}`;
}

function cssColor(argb?: string) {
  if (!argb) {
    return undefined;
  }
  const hex = argb.replace(/^FF/i, "");
  if (hex.length === 6) {
    return `#${hex.toLowerCase()}`;
  }
  if (argb.length === 8) {
    return `#${argb.slice(2).toLowerCase()}`;
  }
  return undefined;
}

function themeColor(color?: { theme?: number; argb?: string }) {
  if (!color || !("theme" in color) || color.theme == null) {
    return undefined;
  }
  return Number(color.theme) === 1 ? "#1f1f1f" : undefined;
}

function findColorHeaderRow(sheet: ExcelJS.Worksheet): number | null {
  let headerRow: number | null = null;
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      const text = readCellText(cell);
      if (text && COLOR_HEADER.test(text) && headerRow == null) {
        headerRow = Number(cell.row);
      }
    });
  });
  return headerRow;
}

function findColorGridBox(
  sheet: ExcelJS.Worksheet,
  merges: MergeBox[],
  colStarts: number[],
  rowStarts: number[],
  columns: number[],
  rows: number[],
  firstSheetRow: number,
  colorHeaderRow: number | null,
): QuoteSheetView["colorGrid"] {
  if (colorHeaderRow == null) {
    return null;
  }
  const body = merges.find((merge) => merge.top === colorHeaderRow + 1 && merge.left === 1 && merge.bottom > merge.top);
  if (!body) {
    return null;
  }
  const displayTop = body.top - firstSheetRow;
  const displayBottom = body.bottom - firstSheetRow;
  return {
    left: colStarts[body.left - 1] ?? 0,
    top: rowStarts[displayTop] ?? 0,
    width: sumRange(columns, body.left - 1, body.right),
    height: sumRange(rows, displayTop, displayBottom + 1),
  };
}

function sumRange(sizes: number[], start: number, end: number) {
  let total = 0;
  for (let i = start; i < end && i < sizes.length; i += 1) {
    total += sizes[i];
  }
  return total;
}

function sheetImages(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  colCount: number,
  colStarts: number[],
  sheetRowStarts: number[],
  clipTop: number,
  clipHeight: number,
  colorGrid: QuoteSheetView["colorGrid"],
  colorHeaderRow: number | null,
): QuoteSheetView["images"] {
  const images: QuoteSheetView["images"] = [];
  for (const image of sheet.getImages()) {
    const media = workbook.getImage(Number(image.imageId));
    const buffer = media?.buffer;
    if (!buffer) {
      continue;
    }
    const src = dataUrl(buffer, media.extension);
    const box = imageBox(image.range, colStarts, sheetRowStarts);
    if (!box) {
      continue;
    }
    box.top -= clipTop;
    if (box.top + box.height <= 0 || box.top >= clipHeight) {
      continue;
    }
    const nativeCol = image.range.tl.nativeCol ?? 0;
    const nativeRow = image.range.tl.nativeRow ?? 0;
    const sheetRow = nativeRow + 1;
    if (colorHeaderRow != null && nativeCol <= 1 && sheetRow >= colorHeaderRow) {
      continue;
    }
    if (colorGrid && overlaps(box, colorGrid)) {
      continue;
    }
    if (nativeCol >= colCount) {
      continue;
    }
    images.push({ ...box, src });
  }
  return images;
}

function imageBox(
  range: {
    tl: { nativeCol?: number; nativeRow?: number; nativeColOff?: number; nativeRowOff?: number };
    br?: { nativeCol?: number; nativeRow?: number; nativeColOff?: number; nativeRowOff?: number };
    ext?: { width: number; height: number };
  },
  colStarts: number[],
  rowStarts: number[],
): { left: number; top: number; width: number; height: number } | null {
  const tl = range.tl;
  const br = range.br;
  if (!tl) {
    return null;
  }
  const left = (colStarts[tl.nativeCol ?? 0] ?? 0) + (tl.nativeColOff ?? 0) / EMU_PER_PX;
  const top = (rowStarts[tl.nativeRow ?? 0] ?? 0) + (tl.nativeRowOff ?? 0) / EMU_PER_PX;
  let width = 80;
  let height = 80;
  if (br) {
    const right = (colStarts[br.nativeCol ?? 0] ?? colStarts[colStarts.length - 1] ?? 0) + (br.nativeColOff ?? 0) / EMU_PER_PX;
    const bottom = (rowStarts[br.nativeRow ?? 0] ?? rowStarts[rowStarts.length - 1] ?? 0) + (br.nativeRowOff ?? 0) / EMU_PER_PX;
    width = Math.max(8, right - left);
    height = Math.max(8, bottom - top);
  } else if (range.ext) {
    width = range.ext.width;
    height = range.ext.height;
  }
  return { left, top, width, height };
}

function overlaps(a: { left: number; top: number; width: number; height: number }, b: { left: number; top: number; width: number; height: number }) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

function dataUrl(buffer: unknown, extension?: string) {
  const mime = extension === "jpeg" || extension === "jpg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${Buffer.from(buffer as Uint8Array).toString("base64")}`;
}
