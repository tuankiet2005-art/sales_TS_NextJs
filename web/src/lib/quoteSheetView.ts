export type QuoteSheetCellStyle = {
  background?: string;
  color?: string;
  fontWeight?: number | string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  textAlign?: string;
  verticalAlign?: string;
  whiteSpace?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
};

export type QuoteSheetCellView = {
  r: number;
  c: number;
  text: string;
  colspan?: number;
  rowspan?: number;
  style: QuoteSheetCellStyle;
};

export type QuoteSheetImageView = {
  left: number;
  top: number;
  width: number;
  height: number;
  src: string;
};

export type QuoteSheetBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type QuoteSheetView = {
  width: number;
  height: number;
  columns: number[];
  rows: number[];
  cells: QuoteSheetCellView[];
  images: QuoteSheetImageView[];
  colorGrid: QuoteSheetBox | null;
};
