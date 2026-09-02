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
  const gifts = giftItems(input.gifts);
  const optionalBody = amounts.get("OPTIONAL_BODY_INSURANCE") ?? 0;
  const accessoryNames =
    !input.accessories?.length
      ? "Phụ kiện trang bị thêm (Nếu có)"
      : `Phụ kiện trang bị thêm: ${input.accessories
          .map((item) => `${item.name} (${formatQuoteAmount(item.amount)})`)
          .join("; ")}`;

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
    QUA_TANG_7: gifts[6] ?? "",
    QUA_TANG_8: gifts[7] ?? "",
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
  writeBesideLabel(sheet, "TỔNG CP PHÁT SINH", extras);
  writeBesideLabel(sheet, "Chi Phí Phát sinh thêm (Nếu có)", extras);
  writeBesideLabel(sheet, "Tiền cọc:", input.deposit);
  writeBesideLabel(sheet, "Số tiền vay", loanAmount);
  writeAfterLabelIfUnfilled(sheet, "Khách hàng:", `Khách hàng: ${input.customerName?.trim() || "Khách hàng"}`);
  writeAfterLabelIfUnfilled(sheet, "Đời xe:", `Đời xe: ${input.modelYear ?? ""}`);
  writeAfterLabelIfUnfilled(sheet, "Ngày:", `Ngày: ${formatDate(new Date())}`);
  writeAfterLabel(sheet, "Phụ kiện trang bị thêm", accessoryNames);
  writeAfterLabel(
    sheet,
    "* Chính sách bảo hành",
    `* Chính sách bảo hành: ${input.warrantyNote || "3 năm/100.000km"} tùy theo điều kiện nào đến trước`,
  );
}

function giftItems(gifts?: string | null) {
  return (gifts ?? "")
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}
