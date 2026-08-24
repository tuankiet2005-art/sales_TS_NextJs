import type ExcelJS from "exceljs";

import { formatQuoteAmount } from "@/lib/format";
import { translateQuoteLabel } from "@/lib/quoteLabels";
import type { Lang } from "@/i18n/translations";

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
  listPrice: number;
  discountAmount: number;
  salePrice: number;
  fees: QuoteFeeLine[];
  totalMandatoryFees: number;
  totalOptionalFees: number;
  accessoriesTotal: number;
  estimatedOnRoadTotal: number;
  deposit: number;
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

function fillQuote(sheet: ExcelJS.Worksheet, input: QuoteSheetFillInput) {
  const amounts = new Map<string, number>();
  for (const fee of input.fees) {
    amounts.set(fee.code, fee.includedInTotal ? fee.amount : 0);
  }

  const color = input.color?.trim() || "";
  const extras = input.accessoriesTotal || 0;
  const secondPayment = Math.max(input.estimatedOnRoadTotal - input.deposit, 0);
  const accessoryNames =
    !input.accessories?.length
      ? "Phụ kiện trang bị thêm (Nếu có)"
      : `Phụ kiện trang bị thêm: ${input.accessories
          .map((item) => `${item.name} (${formatQuoteAmount(item.amount)})`)
          .join("; ")}`;
  const optionalBody = amounts.get("OPTIONAL_BODY_INSURANCE") ?? 0;
  const today = formatDate(new Date());

  writeAfterLabel(sheet, "Khách hàng:", `Khách hàng: ${input.customerName?.trim() || "Khách hàng"}`);
  writeAfterLabel(sheet, "Địa chỉ:", padAddress(input.customerAddress));
  writeBesideLabel(sheet, "Loại xe:", input.vehicleName);
  writeAfterLabel(sheet, "Đời xe:", `Đời xe: ${input.modelYear ?? ""}`);
  writeAfterLabel(sheet, "Ngày:", `Ngày: ${today}`);
  writeBesideLabel(sheet, "Giá niêm yết:", input.listPrice);
  writeBesideLabel(sheet, "Giảm giá:", input.discountAmount);
  writeBesideLabel(sheet, "Giá Bán:", input.salePrice);
  writeBesideLabel(sheet, "Màu xe", color);
  writeBesideLabel(sheet, "TG giao xe:", input.deliveryNote ?? "");
  writeBesideLabel(sheet, "Thuế trước bạ (tạm tính)", amounts.get("REGISTRATION_TAX") ?? 0);
  writeBesideLabel(sheet, "Phí bấm biển số", amounts.get("LICENSE_PLATE") ?? 0);
  writeBesideLabel(sheet, "Lệ phí đăng kiểm", amounts.get("INSPECTION") ?? 0);
  writeBesideLabel(sheet, "Bảo hiểm TNDS + Người ngồi xe (1 năm)", amounts.get("COMPULSORY_INSURANCE") ?? 0);
  writeBesideLabel(sheet, "Phí sử dụng đường bộ (1 năm)", amounts.get("ROAD_USE") ?? 0);
  writeBesideLabel(sheet, "Bảo hiểm vật chất thân vỏ xe", optionalBody || "Tặng");
  writeBesideLabel(sheet, "Biển số mica", amounts.get("MICA_PLATE") ?? 0);
  writeBesideLabel(
    sheet,
    "Phí dịch vụ đăng ký xe",
    amounts.get("REGISTRATION_SERVICE") ?? amounts.get("REGISTRATION_FEE") ?? 0,
  );
  writeBesideLabel(sheet, "Tổng Chi Phí Đăng ký xe", input.totalMandatoryFees + input.totalOptionalFees);
  writeAfterLabel(sheet, "Phụ kiện trang bị thêm", accessoryNames);
  writeBesideLabel(sheet, "TỔNG LĂNG BÁNH", input.estimatedOnRoadTotal);
  writeBesideLabel(sheet, "TỔNG CP PHÁT SINH", extras);
  writeBesideLabel(sheet, "Chi Phí Phát sinh thêm (Nếu có)", extras);
  writeBesideLabel(sheet, "Tiền cọc:", input.deposit);
  writeBesideLabel(sheet, "THANH TOÁN LẦN 2", secondPayment);
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

function writeAfterLabel(sheet: ExcelJS.Worksheet, prefix: string, fullValue: string) {
  const found = findLabelCell(sheet, (text) => text.startsWith(prefix));
  if (found) {
    found.value = fullValue;
  }
}

function writeBesideLabel(sheet: ExcelJS.Worksheet, label: string, value: string | number) {
  const found = findLabelCell(sheet, (text) => text === label || text.startsWith(label));
  if (!found) {
    return;
  }
  const row = Number(found.row);
  const col = Number(found.col);
  const target = sheet.getCell(row, mergeEndCol(sheet, row, col) + 1);
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

function writeValue(cell: ExcelJS.Cell, value: string | number) {
  cell.value = value;
}

function readCellText(cell: ExcelJS.Cell): string | null {
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

function padAddress(address?: string) {
  const value = address?.trim() ?? "";
  return `Địa chỉ: ${value}                                                                                          TVBH:        - SĐT: `;
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}
