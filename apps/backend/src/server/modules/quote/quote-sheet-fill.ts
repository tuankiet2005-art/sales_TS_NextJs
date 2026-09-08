import type ExcelJS from "exceljs";

import { translateQuoteLabel } from "@onroad/shared/quote/quoteLabels";
import type { Lang } from "@onroad/shared/i18n/lang";

export type QuoteFeeLine = {
  code: string;
  amount: number;
  includedInTotal: boolean;
};

export type QuoteSheetFillInput = {
  language?: string;
  customerName?: string;
  customerAddress?: string;
  color?: string;
  quoteSheetName?: string | null;
  vehicleName: string;
  model?: string;
  modelYear?: number | null;
  deliveryNote?: string | null;
  gifts?: string | null;
  warrantyNote?: string | null;
  listPrice: number;
  discountAmount: number;
  salePrice: number;
  fees: QuoteFeeLine[];
  totalMandatoryFees: number;
  totalOptionalFees: number;
  accessoriesTotal: number;
  estimatedOnRoadTotal: number;
  deposit: number;
  bankLoan?: {
    bankId?: number;
    bankName?: string;
    monthlyInterestRate?: number;
    loanTermYears?: number;
    fixedRatePeriodYears?: number;
    consultingEmployeeId?: number;
    consultingEmployeeName?: string;
    consultingEmployeePhone?: string;
  };
  accessories?: { name: string; amount: number }[];
};

export function fillQuoteWorkbook(workbook: ExcelJS.Workbook, input: QuoteSheetFillInput) {
  const sheet = resolveQuoteSheet(workbook, input.quoteSheetName, input.vehicleName, input.model);
  if (!sheet) {
    throw new Error("Quote template sheet missing");
  }

  fillQuote(sheet, input);
  const language = normalizeLanguage(input.language);
  if (language !== "vi") {
    translateSheet(sheet, language);
  }

  for (const other of workbook.worksheets) {
    other.state = other === sheet ? "visible" : "hidden";
  }
  const activeTab = workbook.worksheets.indexOf(sheet);
  workbook.views = [
    {
      x: 0,
      y: 0,
      width: 20000,
      height: 20000,
      firstSheet: 0,
      activeTab: Math.max(0, activeTab),
      visibility: "visible",
    },
  ];
}

export function resolveQuoteSheet(
  workbook: ExcelJS.Workbook,
  preferred?: string | null,
  vehicleName?: string,
  model?: string,
) {
  if (preferred) {
    const exact = workbook.getWorksheet(preferred);
    if (exact) {
      return exact;
    }
  }

  const needles = [preferred, vehicleName, model].filter(Boolean).map((value) => value!.toLowerCase());
  let best: ExcelJS.Worksheet | undefined;
  let bestScore = 0;
  for (const sheet of workbook.worksheets) {
    if (!sheet.rowCount) {
      continue;
    }
    const name = sheet.name.toLowerCase();
    for (const needle of needles) {
      if (name === needle) {
        return sheet;
      }
      if (name.includes(needle) || needle.includes(name)) {
        const score = Math.min(name.length, needle.length);
        if (score > bestScore) {
          best = sheet;
          bestScore = score;
        }
      }
    }
  }
  return best ?? workbook.worksheets.find((sheet) => sheet.rowCount > 0) ?? workbook.worksheets[0];
}

export function normalizeLanguage(language?: string): Lang {
  const code = (language ?? "vi").trim().toLowerCase();
  if (code.startsWith("en")) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("ja")) return "ja";
  return "vi";
}

export function readCellText(cell: ExcelJS.Cell): string | null {
  const value = cell.value;
  if (typeof value === "string") {
    return value.trim();
  }
  if (value && typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part: { text: string }) => part.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
  }
  return null;
}

const GIFT_SLOT_COUNT = 6;
const GIFT_HEADER = /Quà Tặng/i;
const ACCESSORY_HEADER = /CHI PHÍ PHÁT SINH THÊM/i;
const QUOTE_SECTION_HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Times New Roman",
  size: 14,
  bold: true,
  color: { argb: "FFFF0000" },
};
const QUOTE_SECTION_HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  horizontal: "center",
  vertical: "middle",
};
const DASHCAM_QUOTE_LABEL = "Camera hành trình (Hộp đen)";
const QUOTE_MONEY_NUM_FMT = "#,##0";

function fillQuote(sheet: ExcelJS.Worksheet, input: QuoteSheetFillInput) {
  const amounts = new Map<string, number>();
  for (const fee of input.fees) {
    amounts.set(fee.code, fee.includedInTotal ? fee.amount : 0);
  }

  const extras = input.accessoriesTotal || 0;
  const loanTermYears = input.bankLoan?.loanTermYears ?? 5;
  const monthlyInterestRate = input.bankLoan?.monthlyInterestRate ?? 0.65;
  const months = loanTermYears * 12;
  const loanAmount = Math.max(input.salePrice - input.deposit, 0);
  const annualRateDecimal = (monthlyInterestRate * 12) / 100;
  const gifts = giftItems(input.gifts).slice(0, GIFT_SLOT_COUNT);
  const optionalBody = amounts.get("OPTIONAL_BODY_INSURANCE") ?? 0;

  applyTokens(sheet, {
    TEN_KHACH_HANG: input.customerName?.trim() || "Khách hàng",
    DIA_CHI_KHACH_HANG: input.customerAddress?.trim() || "",
    TEN_TVBH: input.bankLoan?.consultingEmployeeName?.trim() || "",
    SDT_TVBH: input.bankLoan?.consultingEmployeePhone?.trim() || "",
    DOI_XE: input.modelYear ?? "",
    GIA_NIEM_YET: input.listPrice,
    GIAM_GIA: input.discountAmount,
    MAU_XE: input.color?.trim() || "",
    THUE_TRUOC_BA: amounts.get("REGISTRATION_TAX") ?? 0,
    PHI_BAM_BIEN_SO: amounts.get("LICENSE_PLATE") ?? 0,
    LE_PHI_DANG_KIEM: amounts.get("INSPECTION") ?? 0,
    BH_TNDS: amounts.get("COMPULSORY_INSURANCE") ?? 0,
    PHI_DUONG_BO: amounts.get("ROAD_USE") ?? 0,
    PHI_DICH_VU_DANG_KY: amounts.get("REGISTRATION_SERVICE") ?? amounts.get("REGISTRATION_FEE") ?? 0,
    QUA_TANG_1: gifts[0] ?? "",
    QUA_TANG_2: gifts[1] ?? "",
    QUA_TANG_3: gifts[2] ?? "",
    QUA_TANG_4: gifts[3] ?? "",
    QUA_TANG_5: gifts[4] ?? "",
    QUA_TANG_6: gifts[5] ?? "",
    TIEN_COC_TM: input.deposit,
    SO_TIEN_VAY_NH: loanAmount,
    THOI_GIAN_VAY: `${loanTermYears} Năm`,
    SO_THANG_VAY: months,
    LAI_SUAT_NAM: annualRateDecimal,
  });

  writeBesideLabel(sheet, "Loại xe:", input.vehicleName);
  writeBesideLabel(sheet, "TG giao xe:", input.deliveryNote ?? "");
  writeBesideLabel(sheet, "Màu xe", input.color?.trim() || "");
  writeBesideLabel(sheet, "Giá niêm yết:", input.listPrice);
  writeBesideLabel(sheet, "Giảm giá:", input.discountAmount);
  writeBesideLabel(sheet, "Giá Bán:", input.salePrice);
  writeBesideLabel(sheet, "Thuế trước bạ (tạm tính)", amounts.get("REGISTRATION_TAX") ?? 0);
  writeBesideLabel(sheet, "Phí bấm biển số", amounts.get("LICENSE_PLATE") ?? 0);
  writeBesideLabel(sheet, "Lệ phí đăng kiểm", amounts.get("INSPECTION") ?? 0);
  writeBesideLabel(sheet, "Bảo hiểm TNDS + Người ngồi xe (1 năm)", amounts.get("COMPULSORY_INSURANCE") ?? 0);
  writeBesideLabel(sheet, "Phí sử dụng đường bộ (1 năm)", amounts.get("ROAD_USE") ?? 0);
  writeBesideLabel(sheet, "Bảo hiểm thân vỏ ( 1.3%)", optionalBody || "");
  writeBesideLabel(
    sheet,
    "Phí dịch vụ đăng ký xe",
    amounts.get("REGISTRATION_SERVICE") ?? amounts.get("REGISTRATION_FEE") ?? 0,
  );
  writeBesideLabel(sheet, "Tổng Chi Phí Đăng ký xe", input.totalMandatoryFees + input.totalOptionalFees);
  writeBesideLabel(sheet, "TỔNG LĂNG BÁNH", input.estimatedOnRoadTotal);
  writeAccessoryRows(sheet, input.accessories ?? []);
  writeAccessoryTotal(sheet, extras);
  collapseAccessoryTotalSpacerRow(sheet);
  normalizeAccessorySectionBorders(sheet);
  writeBesideLabel(sheet, "Chi Phí Phát sinh thêm (Nếu có)", extras);
  writeBesideLabel(sheet, "Tiền cọc:", input.deposit);
  writeBesideLabel(sheet, "Số tiền vay", loanAmount);
  writeAfterLabelIfUnfilled(sheet, "Khách hàng:", `Khách hàng: ${input.customerName?.trim() || "Khách hàng"}`);
  writeAfterLabelIfUnfilled(sheet, "Đời xe:", `Đời xe: ${input.modelYear ?? ""}`);
  writeAfterLabelIfUnfilled(sheet, "Ngày:", `Ngày: ${formatDate(new Date())}`);
  writeAfterLabel(
    sheet,
    "* Chính sách bảo hành",
    `* Chính sách bảo hành: ${input.warrantyNote || "3 năm/100.000km"} tùy theo điều kiện nào đến trước`,
  );
  // normalizeQuoteMoneyCells(sheet);
  normalizeQuoteMoneyCells(sheet);
  restoreQuoteSectionHeaderStyles(sheet);
  restoreMonthlyPaymentPlanStyles(sheet);
}

function giftItems(gifts?: string | null) {
  return (gifts ?? "")
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAccessoryTotalLabel(text: string) {
  return /^TỔNG (CP|CHI PHÍ) PHÁT SINH/i.test(text.trim());
}

function findAccessorySection(sheet: ExcelJS.Worksheet) {
  const headerCell = findLabelCell(sheet, (text) => ACCESSORY_HEADER.test(text));
  const totalCell = findLabelCell(sheet, (text) => isAccessoryTotalLabel(text));
  if (!headerCell || !totalCell) {
    return null;
  }

  const headerRow = Number(headerCell.row);
  let totalRow = Number(totalCell.row);
  if (totalRow <= headerRow) {
    return null;
  }

  let firstItemRow = headerRow + 1;

  return { headerRow, firstItemRow, totalRow };
}

function applyTokens(sheet: ExcelJS.Worksheet, tokens: Record<string, string | number>) {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      const text = rawCellText(cell);
      if (!text || !text.includes("{{")) {
        return;
      }
      const only = text.match(/^\s*\{\{([A-Z0-9_]+)\}\}\s*$/);
      if (only) {
        const value = tokens[only[1]];
        cell.value = value ?? "";
        return;
      }
      cell.value = text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: string) => {
        const value = tokens[key];
        return value == null ? "" : String(value);
      });
    });
  });
}

function rawCellText(cell: ExcelJS.Cell): string | null {
  const value = cell.value;
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part: { text: string }) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
  }
  return null;
}

function translateSheet(sheet: ExcelJS.Worksheet, language: Lang) {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      const text = readCellText(cell);
      if (!text) {
        return;
      }
      const translated = translateQuoteLabel(text, language);
      if (translated !== text) {
        cell.value = translated;
      }
    });
  });
}

function writeAfterLabelIfUnfilled(sheet: ExcelJS.Worksheet, prefix: string, fullValue: string) {
  const found = findLabelCell(sheet, (text) => text.startsWith(prefix));
  if (!found) {
    return;
  }
  const text = readCellText(found) ?? "";
  if (text.includes("{{")) {
    found.value = fullValue;
    return;
  }
  if (text.length > prefix.length + 1) {
    return;
  }
  found.value = fullValue;
}

function writeAfterLabel(sheet: ExcelJS.Worksheet, prefix: string, fullValue: string) {
  const found = findLabelCell(sheet, (text) => text.startsWith(prefix));
  if (found) {
    found.value = fullValue;
  }
}

function writeAccessoryRows(sheet: ExcelJS.Worksheet, accessories: { name: string; amount: number }[]) {
  const section = findAccessorySection(sheet);
  if (!section) {
    return;
  }

  const items = mapAccessoryQuoteItems(accessories);
  const accessoryStartRow = section.firstItemRow;
  let totalRow = section.totalRow;
  const initialTotalRow = totalRow;
  const originalMerges = [...((sheet.model as { merges?: string[] }).merges ?? [])];
  let itemRowCount = totalRow - accessoryStartRow;
  const insertedRowCount = Math.max(0, items.length - itemRowCount);

  while (itemRowCount < items.length) {
    sheet.spliceRows(totalRow, 0, []);
    setupAccessoryOnlyRow(sheet, totalRow, accessoryStartRow);
    totalRow += 1;
    itemRowCount += 1;
  }

  if (insertedRowCount > 0) {
    shiftMergeRanges(sheet, originalMerges, initialTotalRow, insertedRowCount);
    for (let row = initialTotalRow; row < initialTotalRow + insertedRowCount; row += 1) {
      ensureAccessoryRowMerges(sheet, row);
    }
    shiftFormulaRowReferences(sheet, initialTotalRow, insertedRowCount);
    shiftSheetImages(sheet, initialTotalRow, insertedRowCount);
  }

  for (let row = accessoryStartRow; row < totalRow; row += 1) {
    const index = row - accessoryStartRow;
    const accessory = items[index];
    if (accessory) {
      writeAccessoryRow(sheet, row, accessory.name, accessory.amount);
    } else {
      writeAccessoryRow(sheet, row, "");
    }
  }
}

function mapAccessoryQuoteItems(accessories: { name: string; amount: number }[]) {
  const dashcam: { name: string; amount: number }[] = [];
  const others: { name: string; amount: number }[] = [];
  for (const item of accessories) {
    if (isDashcamAccessory(item.name)) {
      dashcam.push({ name: DASHCAM_QUOTE_LABEL, amount: item.amount });
    } else {
      others.push(item);
    }
  }
  return [...dashcam, ...others];
}

function isDashcamAccessory(name: string) {
  const normalized = name.trim();
  return /hộp\s*đen|camera\s*hành\s*trình|cam\s*hành\s*trình|dashcam/i.test(normalized);
}

function writeAccessoryTotal(sheet: ExcelJS.Worksheet, value: string | number) {
  const found = findLabelCell(sheet, (text) => isAccessoryTotalLabel(text));
  if (!found) {
    return;
  }
  const row = Number(found.row);
  const col = Number(found.col);
  const target = sheet.getCell(row, mergeEndCol(sheet, row, col) + 1);
  if (rawCellText(target)?.includes("{{") || cellHasFormula(target)) {
    return;
  }
  writeValue(target, value);
}

const CASH_PLAN_HEADER = /PHƯƠNG ÁN:\s*MUA TIỀN MẶT/i;
const MONTHLY_PAYMENT_HEADER = /PHƯƠNG ÁN TRẢ HÀNG THÁNG/i;
const ON_ROAD_TOTAL_LABEL = /TỔNG LĂNG BÁNH/i;

function collapseAccessoryTotalSpacerRow(sheet: ExcelJS.Worksheet) {
  const section = findAccessorySection(sheet);
  if (!section) {
    return;
  }

  const cashPlanCell = findLabelCell(sheet, (text) => CASH_PLAN_HEADER.test(text));
  if (!cashPlanCell) {
    return;
  }

  let cashPlanRow = Number(cashPlanCell.row);
  const totalRow = section.totalRow;

  while (cashPlanRow > totalRow + 1) {
    const spacerRow = cashPlanRow - 1;
    const spacerLabel = readCellText(sheet.getCell(spacerRow, 4)) ?? "";
    if (isAccessoryTotalLabel(spacerLabel) || !rowSideEmpty(sheet, spacerRow, 4, 7)) {
      break;
    }
    if (!rowSideEmpty(sheet, spacerRow, 1, 3)) {
      break;
    }

    const originalMerges = [...((sheet.model as { merges?: string[] }).merges ?? [])];
    sheet.spliceRows(spacerRow, 1);
    shiftMergeRangesOnDelete(sheet, originalMerges, spacerRow);
    shiftFormulaRowReferencesOnDelete(sheet, spacerRow);
    shiftSheetImagesOnDelete(sheet, spacerRow);
    cashPlanRow -= 1;
  }
}

function rowSideEmpty(sheet: ExcelJS.Worksheet, row: number, fromCol: number, toCol: number) {
  for (let col = fromCol; col <= toCol; col += 1) {
    const text = readCellText(sheet.getCell(row, col));
    if (text) {
      return false;
    }
  }
  return true;
}

function copyRowSide(
  sheet: ExcelJS.Worksheet,
  fromRow: number,
  toRow: number,
  fromCol: number,
  toCol: number,
) {
  for (let col = fromCol; col <= toCol; col += 1) {
    const source = sheet.getRow(fromRow).getCell(col);
    const target = sheet.getRow(toRow).getCell(col);
    target.value = source.value;
    target.style = JSON.parse(JSON.stringify(source.style));
    target.alignment = source.alignment ? { ...source.alignment } : target.alignment;
  }
}

function copyFullRow(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number) {
  const source = sheet.getRow(fromRow);
  const target = sheet.getRow(toRow);
  target.height = source.height;
  copyRowSide(sheet, fromRow, toRow, 1, 7);
}

function setupAccessoryOnlyRow(sheet: ExcelJS.Worksheet, row: number, styleSourceRow: number) {
  for (let col = 1; col <= 3; col += 1) {
    sheet.getCell(row, col).value = "";
  }
  const sourceRow = sheet.getRow(styleSourceRow);
  const targetRow = sheet.getRow(row);
  targetRow.height = sourceRow.height;
  for (let col = 4; col <= 7; col += 1) {
    const sourceCell = sourceRow.getCell(col);
    const targetCell = targetRow.getCell(col);
    targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
    targetCell.value = "";
  }
}

type MergeBox = { top: number; left: number; bottom: number; right: number };

function parseMergeRange(range: string): MergeBox {
  const [start, end] = range.split(":");
  const from = { row: 0, col: 0 };
  const to = { row: 0, col: 0 };
  const startMatch = start.match(/^([A-Z]{1,3})(\d+)$/);
  const endMatch = (end ?? start).match(/^([A-Z]{1,3})(\d+)$/);
  if (!startMatch || !endMatch) {
    throw new Error(`Invalid merge range: ${range}`);
  }
  from.col = columnLettersToNumber(startMatch[1]);
  from.row = Number(startMatch[2]);
  to.col = columnLettersToNumber(endMatch[1]);
  to.row = Number(endMatch[2]);
  return {
    top: Math.min(from.row, to.row),
    left: Math.min(from.col, to.col),
    bottom: Math.max(from.row, to.row),
    right: Math.max(from.col, to.col),
  };
}

function columnLettersToNumber(letters: string) {
  let value = 0;
  for (const letter of letters) {
    value = value * 26 + (letter.charCodeAt(0) - 64);
  }
  return value;
}

function mergeRangeString(box: MergeBox) {
  const start = `${columnNumberToLetters(box.left)}${box.top}`;
  const end = `${columnNumberToLetters(box.right)}${box.bottom}`;
  return start === end ? start : `${start}:${end}`;
}

function columnNumberToLetters(value: number) {
  let letters = "";
  let current = value;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    current = Math.floor((current - 1) / 26);
  }
  return letters;
}

function shiftMergeBox(box: MergeBox, fromRow: number, rowCount: number): MergeBox {
  if (box.top >= fromRow) {
    return { ...box, top: box.top + rowCount, bottom: box.bottom + rowCount };
  }
  if (box.bottom >= fromRow) {
    return { ...box, bottom: box.bottom + rowCount };
  }
  return box;
}

function shiftMergeBoxOnDelete(box: MergeBox, deletedRow: number): MergeBox | null {
  if (box.top === box.bottom && box.top === deletedRow) {
    return { ...box, top: deletedRow - 1, bottom: deletedRow - 1 };
  }
  if (box.top <= deletedRow && box.bottom >= deletedRow) {
    const bottom = box.bottom - 1;
    if (box.top > bottom) {
      return null;
    }
    return { ...box, bottom };
  }
  if (box.top > deletedRow) {
    return { ...box, top: box.top - 1, bottom: box.bottom - 1 };
  }
  return box;
}

function clearAllMerges(sheet: ExcelJS.Worksheet) {
  const worksheet = sheet as ExcelJS.Worksheet & {
    _merges?: Record<string, unknown>;
    _unMergeMaster?: (master: ExcelJS.Cell) => void;
  };
  for (const masterAddress of Object.keys(worksheet._merges ?? {})) {
    try {
      worksheet._unMergeMaster?.(sheet.getCell(masterAddress));
    } catch {
      // Ignore stale merge masters.
    }
  }
  worksheet._merges = {};
  (sheet.model as { merges?: string[] }).merges = [];
}

function shiftMergeRangesOnDelete(
  sheet: ExcelJS.Worksheet,
  originalMerges: string[],
  deletedRow: number,
) {
  const seen = new Set<string>();
  const shifted: string[] = [];
  for (const range of originalMerges) {
    const box = shiftMergeBoxOnDelete(parseMergeRange(range), deletedRow);
    if (!box) {
      continue;
    }
    const next = mergeRangeString(box);
    if (seen.has(next)) {
      continue;
    }
    seen.add(next);
    shifted.push(next);
  }

  clearAllMerges(sheet);
  for (const range of shifted) {
    const box = parseMergeRange(range);
    try {
      sheet.mergeCells(box.top, box.left, box.bottom, box.right);
    } catch {
      // Skip invalid merges after structural edits.
    }
  }
}

function shiftFormulaRowReferencesOnDelete(sheet: ExcelJS.Worksheet, deletedRow: number) {
  const updates = new Map<string, string>();
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      const value = cell.value;
      if (!value || typeof value !== "object" || !("formula" in value) || !value.formula) {
        return;
      }
      const key = `${cell.row}:${cell.col}`;
      if (updates.has(key)) {
        return;
      }
      const formula = String(value.formula);
      const shifted = formula.replace(/\b([A-Z]{1,3})(\d+)\b/g, (match, column: string, rowNumber: string) => {
        const referencedRow = Number(rowNumber);
        return referencedRow > deletedRow ? `${column}${referencedRow - 1}` : match;
      });
      if (shifted !== formula) {
        updates.set(key, shifted);
      }
    });
  });

  for (const [key, formula] of updates) {
    const [row, col] = key.split(":").map(Number);
    const cell = sheet.getCell(row, col);
    const value = cell.value;
    if (value && typeof value === "object" && "formula" in value) {
      cell.value = { ...value, formula };
    }
  }
}

function shiftSheetImagesOnDelete(sheet: ExcelJS.Worksheet, deletedRow: number) {
  const deletedNativeRow = deletedRow - 1;
  for (const image of sheet.getImages()) {
    const tl = image.range.tl;
    const br = image.range.br;
    if ((tl.nativeRow ?? 0) > deletedNativeRow) {
      tl.nativeRow = (tl.nativeRow ?? 0) - 1;
    }
    if (br && (br.nativeRow ?? 0) > deletedNativeRow) {
      br.nativeRow = (br.nativeRow ?? 0) - 1;
    }
  }
}

function shiftMergeRanges(
  sheet: ExcelJS.Worksheet,
  originalMerges: string[],
  fromRow: number,
  rowCount: number,
) {
  const shifted = originalMerges.map((range) => {
    const box = shiftMergeBox(parseMergeRange(range), fromRow, rowCount);
    return mergeRangeString(box);
  });

  const worksheet = sheet as ExcelJS.Worksheet & {
    _merges?: Record<string, unknown>;
    _unMergeMaster?: (master: ExcelJS.Cell) => void;
  };
  for (const masterAddress of Object.keys(worksheet._merges ?? {})) {
    try {
      worksheet._unMergeMaster?.(sheet.getCell(masterAddress));
    } catch {
      // Ignore stale merge masters.
    }
  }
  worksheet._merges = {};
  (sheet.model as { merges?: string[] }).merges = [];

  for (const range of shifted) {
    const box = parseMergeRange(range);
    sheet.mergeCells(box.top, box.left, box.bottom, box.right);
  }
}

function ensureAccessoryRowMerges(sheet: ExcelJS.Worksheet, row: number) {
  try {
    sheet.mergeCells(row, 4, row, 5);
  } catch {
    // Already merged.
  }
  try {
    sheet.mergeCells(row, 6, row, 7);
  } catch {
    // Already merged.
  }
}

const QUOTE_TABLE_BORDER_SIDE = { style: "thin" as const, color: { argb: "FF1F1F1F" } };

function ensureCellBorderSide(cell: ExcelJS.Cell, side: "top" | "right" | "bottom" | "left") {
  const border = { ...(cell.border ?? {}) };
  if (!border[side]?.style) {
    border[side] = QUOTE_TABLE_BORDER_SIDE;
    cell.border = border;
  }
}

function normalizeAccessorySectionBorders(sheet: ExcelJS.Worksheet) {
  const section = findAccessorySection(sheet);
  if (!section) {
    return;
  }
  for (let row = section.firstItemRow; row <= section.totalRow; row += 1) {
    ensureAccessoryRowMerges(sheet, row);
    ensureCellBorderSide(sheet.getCell(row, 4), "left");
    ensureCellBorderSide(sheet.getCell(row, 7), "right");
  }
}

function shiftSheetImages(sheet: ExcelJS.Worksheet, fromRow: number, rowCount: number) {
  const fromNativeRow = fromRow - 1;
  for (const image of sheet.getImages()) {
    const tl = image.range.tl;
    const br = image.range.br;
    if ((tl.nativeRow ?? 0) >= fromNativeRow) {
      tl.nativeRow = (tl.nativeRow ?? 0) + rowCount;
    }
    if (br && (br.nativeRow ?? 0) >= fromNativeRow) {
      br.nativeRow = (br.nativeRow ?? 0) + rowCount;
    }
  }
}

function shiftFormulaRowReferences(sheet: ExcelJS.Worksheet, fromRow: number, rowCount: number) {
  const updates = new Map<string, string>();
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      const value = cell.value;
      if (!value || typeof value !== "object" || !("formula" in value) || !value.formula) {
        return;
      }
      const key = `${cell.row}:${cell.col}`;
      if (updates.has(key)) {
        return;
      }
      const formula = String(value.formula);
      const shifted = formula.replace(/\b([A-Z]{1,3})(\d+)\b/g, (match, column: string, rowNumber: string) => {
        const referencedRow = Number(rowNumber);
        return referencedRow >= fromRow ? `${column}${referencedRow + rowCount}` : match;
      });
      if (shifted !== formula) {
        updates.set(key, shifted);
      }
    });
  });

  for (const [key, formula] of updates) {
    const [row, col] = key.split(":").map(Number);
    const cell = sheet.getCell(row, col);
    const value = cell.value;
    if (value && typeof value === "object" && "formula" in value) {
      cell.value = { ...value, formula };
    }
  }
}

function writeAccessoryRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  amount?: number,
) {
  sheet.getCell(row, 4).value = label;
  const priceCell = sheet.getCell(row, 6);
  if (!label) {
    priceCell.value = "";
  } else {
    priceCell.value = amount == null ? "" : amount;
    applyQuoteMoneyCellStyle(priceCell);
  }
}

function normalizeAccessoryPriceStyles(sheet: ExcelJS.Worksheet) {
  const section = findAccessorySection(sheet);
  if (!section) {
    return;
  }
  for (let row = section.firstItemRow; row < section.totalRow; row += 1) {
    const priceCell = sheet.getCell(row, 6);
    if (typeof priceCell.value === "number") {
      applyQuoteMoneyCellStyle(priceCell);
    }
  }
}

function restoreQuoteSectionHeaderStyles(sheet: ExcelJS.Worksheet) {
  const giftHeader = findLabelCell(sheet, (text) => GIFT_HEADER.test(text));
  if (giftHeader) {
    paintSectionHeaderRow(sheet, Number(giftHeader.row));
  }
  const section = findAccessorySection(sheet);
  if (section) {
    paintSectionHeaderRow(sheet, section.headerRow);
  }
}

function paintSectionHeaderRow(sheet: ExcelJS.Worksheet, row: number) {
  for (let col = 4; col <= 7; col += 1) {
    const cell = sheet.getCell(row, col);
    cell.font = { ...QUOTE_SECTION_HEADER_FONT };
    cell.alignment = { ...QUOTE_SECTION_HEADER_ALIGNMENT };
  }
}

function restoreMonthlyPaymentPlanStyles(sheet: ExcelJS.Worksheet) {
  const header = findLabelCell(sheet, (text) => MONTHLY_PAYMENT_HEADER.test(text));
  if (!header) {
    return;
  }
  const startRow = Number(header.row) + 1;
  const endRow = startRow + 2;
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = 5; col <= 7; col += 1) {
      const cell = sheet.getCell(row, col);
      const label = readCellText(cell) ?? "";
      if (/^Thanh toán tháng$/i.test(label.trim())) {
        continue;
      }
      cell.alignment = {
        ...(cell.alignment ?? {}),
        horizontal: "center",
        vertical: "middle",
      };
    }
  }
}

function normalizeQuoteMoneyCells(sheet: ExcelJS.Worksheet) {
  normalizeAccessoryPriceStyles(sheet);
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      const value = cell.value;
      if (typeof value === "number" && !cellHasFormula(cell)) {
        applyQuoteMoneyCellStyle(cell);
      }
    });
  });
}

function applyQuoteMoneyCellStyle(cell: ExcelJS.Cell) {
  cell.style = JSON.parse(JSON.stringify(cell.style ?? {}));
  cell.numFmt = QUOTE_MONEY_NUM_FMT;
  cell.font = {
    name: "Times New Roman",
    size: 14,
    bold: false,
    color: { theme: 1 },
  };
  cell.alignment = {
    ...(cell.alignment ?? {}),
    horizontal: "right",
    vertical: "middle",
  };
}

function writeBesideLabel(sheet: ExcelJS.Worksheet, label: string, value: string | number) {
  const matches: ExcelJS.Cell[] = [];
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      const text = readCellText(cell);
      if (text && (text === label || text.startsWith(label))) {
        matches.push(cell);
      }
    });
  });
  const found = matches[0];
  if (!found) {
    return;
  }
  const row = Number(found.row);
  const col = Number(found.col);
  const target = sheet.getCell(row, mergeEndCol(sheet, row, col) + 1);
  if (rawCellText(target)?.includes("{{") || cellHasFormula(target)) {
    return;
  }
  writeValue(target, value);
}

function mergeEndCol(sheet: ExcelJS.Worksheet, row: number, col: number): number {
  const merges = (sheet.model as { merges?: string[] } | undefined)?.merges ?? [];
  for (const range of merges) {
    const [start, end] = range.split(":");
    if (!start) {
      continue;
    }
    const from = sheet.getCell(start);
    const to = sheet.getCell(end ?? start);
    const top = Math.min(Number(from.row), Number(to.row));
    const bottom = Math.max(Number(from.row), Number(to.row));
    const left = Math.min(Number(from.col), Number(to.col));
    const right = Math.max(Number(from.col), Number(to.col));
    if (row >= top && row <= bottom && col >= left && col <= right) {
      return right;
    }
  }
  return col;
}

function findLabelCell(sheet: ExcelJS.Worksheet, match: (text: string) => boolean) {
  let result: ExcelJS.Cell | undefined;
  sheet.eachRow((row) => {
    if (result) {
      return;
    }
    row.eachCell((cell) => {
      if (result) {
        return;
      }
      const text = readCellText(cell);
      if (text && match(text)) {
        result = cell;
      }
    });
  });
  return result;
}

function cellHasFormula(cell: ExcelJS.Cell) {
  const value = cell.value;
  return Boolean(value && typeof value === "object" && "formula" in value);
}

function writeValue(cell: ExcelJS.Cell, value: string | number) {
  if (cellHasFormula(cell)) {
    return;
  }
  cell.value = value;
  if (typeof value === "number") {
    applyQuoteMoneyCellStyle(cell);
  }
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}
