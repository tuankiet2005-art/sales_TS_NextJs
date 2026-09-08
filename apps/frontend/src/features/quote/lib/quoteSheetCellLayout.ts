import type { CSSProperties } from "react";

export type QuoteCellTextAlign = "left" | "center" | "right";
export type QuoteCellVerticalAlign = "top" | "middle" | "bottom";

export function quoteCellTextAlign(excelAlign?: string, text?: string): QuoteCellTextAlign {
  if (excelAlign === "center" || excelAlign === "right") {
    return excelAlign;
  }
  if (text && /^[\d.,\s]+$/.test(text)) {
    return "right";
  }
  return "left";
}

export function quoteCellSpannedHeight(rows: number[], rowIndex: number, rowspan = 1) {
  return rows.slice(rowIndex, rowIndex + rowspan).reduce((sum, height) => sum + height, 0);
}

export function quoteSheetCaptureSize(element: {
  dataset: { quoteWidth?: string; quoteHeight?: string };
  offsetWidth: number;
  offsetHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}) {
  const namedWidth = Number(element.dataset.quoteWidth);
  const namedHeight = Number(element.dataset.quoteHeight);
  return {
    width: Math.ceil(Math.max(namedWidth || 0, element.offsetWidth, element.scrollWidth)),
    height: Math.ceil(Math.max(namedHeight || 0, element.offsetHeight, element.scrollHeight)),
  };
}

export function quoteCellVerticalAlign(excelAlign?: string): QuoteCellVerticalAlign {
  if (excelAlign === "top" || excelAlign === "bottom") {
    return excelAlign;
  }
  return "middle";
}

function quoteCellTextBlockStyle(
  textAlign: QuoteCellTextAlign,
  whiteSpace?: string,
  verticalAlign: QuoteCellVerticalAlign = "middle",
): CSSProperties {
  const wrap = whiteSpace === "pre-wrap";
  return {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    lineHeight: 1.2,
    textAlign,
    whiteSpace: wrap ? "pre-wrap" : "nowrap",
  };
}

/** Rowspan merges need an explicit-height table box — td vertical-align alone leaves text at the top. */
export function quoteCellInnerStyle(
  textAlign: QuoteCellTextAlign,
  whiteSpace?: string,
  cellHeight?: number,
  rowspan = 1,
  verticalAlign: QuoteCellVerticalAlign = "middle",
): CSSProperties {
  if (rowspan > 1 && cellHeight) {
    return {
      display: "table",
      tableLayout: "fixed",
      boxSizing: "border-box",
      width: "100%",
      height: cellHeight,
    };
  }
  return quoteCellTextBlockStyle(textAlign, whiteSpace, verticalAlign);
}

export function quoteCellTextStyle(
  textAlign: QuoteCellTextAlign,
  whiteSpace?: string,
  rowspan = 1,
  verticalAlign: QuoteCellVerticalAlign = "middle",
): CSSProperties | undefined {
  if (rowspan <= 1) {
    return undefined;
  }
  const wrap = whiteSpace === "pre-wrap";
  return {
    display: "table-cell",
    verticalAlign,
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    lineHeight: 1.2,
    textAlign,
    whiteSpace: wrap ? "pre-wrap" : "nowrap",
  };
}
