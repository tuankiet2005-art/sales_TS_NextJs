import PizZip from "pizzip";

import type { QuoteSheetBox, QuoteSheetCellStyle, QuoteSheetColorGridSlot, QuoteSheetImageView, QuoteSheetView } from "@/lib/quoteSheetView";

const DXA_PER_PX = 15;
const EMU_PER_PX = 9525;
const DEFAULT_ROW_DXA = 300;
const TARGET_WIDTH_PX = 1099;
const COLOR_HEADER = /các\s*màu\s*xe/i;

type ParsedTc = {
  xml: string;
  colspan: number;
  vMerge?: "restart" | "continue";
};

type GridCell = {
  r: number;
  c: number;
  text: string;
  colspan: number;
  rowspan: number;
  style: QuoteSheetCellStyle;
};

type PlacedCell = {
  r: number;
  c: number;
  text: string;
  colspan?: number;
  rowspan?: number;
  style: QuoteSheetCellStyle;
};

type TableBorders = {
  top: string;
  right: string;
  bottom: string;
  left: string;
  insideH: string;
  insideV: string;
};

export function docxBufferToQuoteView(buffer: Buffer): QuoteSheetView {
  const zip = new PizZip(buffer);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  const rels = parseRelationships(zip.file("word/_rels/document.xml.rels")?.asText() ?? "");
  const tableXml = xml.match(/<w:tbl>[\s\S]*<\/w:tbl>/)?.[0];
  if (!tableXml) {
    throw new Error("Quote Word template is missing its main table");
  }

  const rawColumns = parseColumnWidths(tableXml);
  const scale = TARGET_WIDTH_PX / Math.max(1, sum(rawColumns));
  const columns = rawColumns.map((width) => Math.max(24, Math.round(width * scale)));
  const rowElements = [...tableXml.matchAll(/<w:tr[\s>][\s\S]*?<\/w:tr>/g)].map((match) => match[0]);
  const rows = rowElements.map((rowXml) => Math.round(rowHeightPx(rowXml) * scale));
  const rowStarts = prefixSums(rows);
  const colStarts = prefixSums(columns);
  const tableBorders = parseTableBorders(tableXml);
  const cells = applyTableBorders(placeCells(rowElements), rows.length, columns.length, tableBorders);
  const colorGrid = findColorGridBox(cells, columns, rows, colStarts, rowStarts);
  const images = extractImages(rowElements, zip, rels, rowStarts, colStarts, columns, colorGrid);

  return {
    width: colStarts[colStarts.length - 1] ?? 0,
    height: rowStarts[rowStarts.length - 1] ?? 0,
    columns,
    rows,
    cells,
    images,
    colorGrid,
  };
}

function placeCells(rowElements: string[]): PlacedCell[] {
  const placed: GridCell[] = [];
  const covered = new Set<string>();

  for (let rowIndex = 0; rowIndex < rowElements.length; rowIndex += 1) {
    const r = rowIndex + 1;
    const tcs = parseTcs(rowElements[rowIndex]);
    let colIndex = 0;

    for (const tc of tcs) {
      while (covered.has(cellKey(r, colIndex + 1))) {
        colIndex += 1;
      }

      const c = colIndex + 1;
      if (tc.vMerge === "continue") {
        for (let spanCol = 0; spanCol < tc.colspan; spanCol += 1) {
          covered.add(cellKey(r, colIndex + spanCol + 1));
        }
        colIndex += tc.colspan;
        continue;
      }

      const rowspan = tc.vMerge === "restart" ? countVerticalSpan(rowElements, rowIndex, colIndex) : 1;
      for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
        for (let colOffset = 0; colOffset < tc.colspan; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }
          covered.add(cellKey(r + rowOffset, c + colOffset));
        }
      }

      placed.push({
        r,
        c,
        text: cellText(tc.xml),
        colspan: tc.colspan,
        rowspan,
        style: cellStyle(tc.xml),
      });
      colIndex += tc.colspan;
    }
  }

  return placed
    .filter((cell) => !covered.has(cellKey(cell.r, cell.c)))
    .map((cell) => ({
      r: cell.r,
      c: cell.c,
      text: cell.text,
      style: cell.style,
      colspan: cell.colspan > 1 ? cell.colspan : undefined,
      rowspan: cell.rowspan > 1 ? cell.rowspan : undefined,
    }));
}

function parseTcs(rowXml: string): ParsedTc[] {
  return [...rowXml.matchAll(/<w:tc[\s>][\s\S]*?<\/w:tc>/g)].map((match) => {
    const xml = match[0];
    return {
      xml,
      colspan: Number(xml.match(/<w:gridSpan w:val="(\d+)"/)?.[1] ?? 1),
      vMerge: xml.match(/<w:vMerge w:val="(restart|continue)"/)?.[1] as "restart" | "continue" | undefined,
    };
  });
}

function countVerticalSpan(rowElements: string[], startRow: number, targetCol: number) {
  let span = 1;
  for (let row = startRow + 1; row < rowElements.length; row += 1) {
    let col = 0;
    let matched = false;
    for (const tc of parseTcs(rowElements[row])) {
      if (col === targetCol) {
        if (tc.vMerge === "continue") {
          span += 1;
          matched = true;
        }
        break;
      }
      col += tc.colspan;
    }
    if (!matched) {
      break;
    }
  }
  return span;
}

function findColorGridBox(
  cells: PlacedCell[],
  columns: number[],
  rows: number[],
  colStarts: number[],
  rowStarts: number[],
): QuoteSheetColorGridSlot | null {
  const header = cells.find((cell) => COLOR_HEADER.test(cell.text));
  if (header) {
    const body = cells.find(
      (cell) =>
        cell.r > header.r &&
        cell.c === header.c &&
        (cell.rowspan ?? 1) > 1 &&
        !cell.text.trim(),
    );
    if (body) {
      return {
        ...cellBox(body, columns, rows, colStarts, rowStarts, header.r === body.r ? 0 : rowStarts[header.r - 1] ?? 0),
        r: body.r,
        c: body.c,
      };
    }
  }

  const slot = cells.find(
    (cell) =>
      (cell.rowspan ?? 1) >= 4 &&
      (cell.colspan ?? 1) >= 2 &&
      !cell.text.trim() &&
      !cell.style.background,
  );
  if (!slot) {
    return null;
  }
  return {
    ...cellBox(slot, columns, rows, colStarts, rowStarts, 0),
    r: slot.r,
    c: slot.c,
  };
}

function cellBox(
  cell: PlacedCell,
  columns: number[],
  rows: number[],
  colStarts: number[],
  rowStarts: number[],
  extraTop = 0,
) {
  const left = colStarts[cell.c - 1] ?? 0;
  const top = (rowStarts[cell.r - 1] ?? 0) + extraTop;
  const width = sumRange(columns, cell.c - 1, cell.c - 1 + (cell.colspan ?? 1));
  const height = sumRange(rows, cell.r - 1, cell.r - 1 + (cell.rowspan ?? 1)) - extraTop;
  return { left, top, width, height };
}

function extractImages(
  rowElements: string[],
  zip: PizZip,
  rels: Map<string, string>,
  rowStarts: number[],
  colStarts: number[],
  columns: number[],
  colorGrid: QuoteSheetBox | null,
): QuoteSheetImageView[] {
  const images: QuoteSheetImageView[] = [];

  for (let rowIndex = 0; rowIndex < rowElements.length; rowIndex += 1) {
    let colIndex = 0;
    for (const tc of parseTcs(rowElements[rowIndex])) {
      const drawing = tc.xml.match(/<w:drawing>[\s\S]*?<\/w:drawing>/)?.[0];
      if (drawing) {
        const extent = drawing.match(/<wp:extent cx="(\d+)" cy="(\d+)"/);
        const embed = drawing.match(/r:embed="([^"]+)"/)?.[1];
        const mediaPath = embed ? rels.get(embed) : undefined;
        const file = mediaPath ? zip.file(`word/${mediaPath}`) : null;
        if (file && extent) {
          const rawWidth = Math.round(Number(extent[1]) / EMU_PER_PX);
          const rawHeight = Math.round(Number(extent[2]) / EMU_PER_PX);
          const cellWidth = columns[colIndex] ?? rawWidth;
          const width = Math.min(rawWidth, Math.max(32, cellWidth - 8));
          const height = Math.min(rawHeight, Math.max(32, width * 0.45));
          const box = {
            left: (colStarts[colIndex] ?? 0) + 4,
            top: (rowStarts[rowIndex] ?? 0) + 4,
            width,
            height,
          };
          if (!colorGrid || !overlaps(box, colorGrid)) {
            images.push({
              ...box,
              src: toDataUrl(file.asNodeBuffer(), mediaPath ?? ""),
            });
          }
        }
      }
      colIndex += tc.colspan;
    }
  }

  return images;
}

function applyTableBorders(
  cells: PlacedCell[],
  rowCount: number,
  colCount: number,
  borders: TableBorders,
): PlacedCell[] {
  return cells.map((cell) => {
    const style = { ...cell.style };
    const rightEdge = cell.c + (cell.colspan ?? 1) - 1;
    const bottomEdge = cell.r + (cell.rowspan ?? 1) - 1;
    if (!style.borderTop || style.borderTop === "none") {
      style.borderTop = cell.r === 1 ? borders.top : borders.insideH;
    }
    if (!style.borderRight || style.borderRight === "none") {
      style.borderRight = rightEdge === colCount ? borders.right : borders.insideV;
    }
    if (!style.borderBottom || style.borderBottom === "none") {
      style.borderBottom = bottomEdge === rowCount ? borders.bottom : borders.insideH;
    }
    if (!style.borderLeft || style.borderLeft === "none") {
      style.borderLeft = cell.c === 1 ? borders.left : borders.insideV;
    }
    return { ...cell, style };
  });
}

function parseTableBorders(tableXml: string): TableBorders {
  const block = tableXml.match(/<w:tblBorders>[\s\S]*?<\/w:tblBorders>/)?.[0] ?? "";
  return {
    top: tableBorderSide(block, "top"),
    right: tableBorderSide(block, "right"),
    bottom: tableBorderSide(block, "bottom"),
    left: tableBorderSide(block, "left"),
    insideH: tableBorderSide(block, "insideH"),
    insideV: tableBorderSide(block, "insideV"),
  };
}

function tableBorderSide(block: string, side: string) {
  const tag = block.match(new RegExp(`<w:${side}\\b[^/]*/>`))?.[0];
  return borderFromTag(tag) ?? "1px solid #1f1f1f";
}

function toDataUrl(buffer: Buffer, mediaPath: string) {
  const mime = mediaPath.endsWith(".png") ? "image/png" : mediaPath.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function parseColumnWidths(tableXml: string) {
  const widths = [...tableXml.matchAll(/<w:gridCol w:w="(\d+)"/g)].map((match) =>
    Math.max(24, Math.round(Number(match[1]) / DXA_PER_PX)),
  );
  return widths.length > 0 ? widths : [120, 120, 80, 120, 120, 80, 120, 120];
}

function rowHeightPx(rowXml: string) {
  const height = rowXml.match(/<w:trHeight w:val="(\d+)"/)?.[1];
  return height ? Math.max(18, Math.round(Number(height) / DXA_PER_PX)) : Math.round(DEFAULT_ROW_DXA / DXA_PER_PX);
}

function cellText(tcXml: string) {
  return [...tcXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((match) => match[1])
    .join("")
    .replace(/\u00a0/g, " ")
    .trim();
}

function cellStyle(tcXml: string): QuoteSheetCellStyle {
  const paragraph = tcXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/)?.[0] ?? tcXml;
  const run = paragraph.match(/<w:r[\s>][\s\S]*?<\/w:r>/)?.[0] ?? paragraph;
  const fill = tcXml.match(/<w:shd[^>]*w:fill="([^"]+)"/)?.[1];
  const align = paragraph.match(/<w:jc w:val="([^"]+)"/)?.[1];
  const bold = /<w:b(?:\s|\/|>)/.test(run);
  const italic = /<w:i(?:\s|\/|>)/.test(run);
  const color = run.match(/<w:color w:val="([^"]+)"/)?.[1];

  return {
    background: fill ? `#${fill}` : undefined,
    color: color && color !== "auto" ? `#${color}` : "#1f1f1f",
    fontWeight: bold ? 700 : 400,
    fontStyle: italic ? "italic" : "normal",
    fontSize: 12,
    fontFamily: "Times New Roman, Times, serif",
    textAlign: align ?? "left",
    verticalAlign: "middle",
    whiteSpace: "pre-wrap",
    borderTop: borderSide(tcXml, "top"),
    borderRight: borderSide(tcXml, "right"),
    borderBottom: borderSide(tcXml, "bottom"),
    borderLeft: borderSide(tcXml, "left"),
  };
}

function borderSide(tcXml: string, side: "top" | "right" | "bottom" | "left") {
  const tag = tcXml.match(new RegExp(`<w:${side}\\b[^/]*/>`))?.[0];
  return borderFromTag(tag);
}

function borderFromTag(tag?: string) {
  if (!tag) {
    return undefined;
  }
  const val = tag.match(/w:val="([^"]+)"/)?.[1];
  if (!val || val === "nil" || val === "none") {
    return "none";
  }
  const color = tag.match(/w:color="([^"]+)"/)?.[1];
  const sz = tag.match(/w:sz="(\d+)"/)?.[1];
  const colorCss = !color || color === "auto" ? "#1f1f1f" : `#${color}`;
  return `${Math.max(1, Math.round(Number(sz ?? 4) / 8))}px solid ${colorCss}`;
}

function parseRelationships(xml: string) {
  const rels = new Map<string, string>();
  for (const match of xml.matchAll(/Relationship Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    rels.set(match[1], match[2]);
  }
  return rels;
}

function prefixSums(values: number[]) {
  const result: number[] = [0];
  for (const value of values) {
    result.push((result[result.length - 1] ?? 0) + value);
  }
  return result;
}

function sumRange(sizes: number[], start: number, end: number) {
  let total = 0;
  for (let index = start; index < end && index < sizes.length; index += 1) {
    total += sizes[index] ?? 0;
  }
  return total;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function overlaps(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

function cellKey(r: number, c: number) {
  return `${r}:${c}`;
}
