import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

import type { CostBreakdown } from "@/types";
import { calculateOnRoad } from "./catalog-service";
import { saveQuote } from "./quote-history-service";

export async function exportQuote(body: {
  vehicleId: number;
  locationId: number;
  categoryId?: number;
  includeOptionalInsurance?: boolean;
  customerName?: string;
  customerAddress?: string;
  color?: string;
  language?: string;
  usageType?: string;
  selectedOfferIds?: string[];
  forgoneOfferIds?: string[];
  discountAmount?: number;
  deposit?: number;
  optionalBodyInsurance?: number;
  registrationServiceFee?: number;
  micaPlateFee?: number;
  inspectionFee?: number;
  accessories?: { name: string; amount: number }[];
}) {
  const calcResult = await calculateOnRoad(body);
  if (!calcResult || "error" in calcResult) {
    return null;
  }
  const calc = calcResult.data;

  await saveQuote({
    customerName: body.customerName?.trim() || "Khách hàng",
    customerAddress: body.customerAddress,
    vehicleId: calc.vehicleId,
    brandCode: calc.brand,
    vehicleName: calc.vehicleName,
    locationId: calc.locationId,
    locationName: calc.locationName,
    categoryId: body.categoryId,
    color: body.color,
    usageType: body.usageType,
    language: body.language,
    includeOptional: body.includeOptionalInsurance ?? false,
    listPrice: calc.listPrice,
    salePrice: calc.salePrice,
    discountAmount: calc.discountAmount,
    deposit: calc.deposit,
    onRoadTotal: calc.estimatedOnRoadTotal,
    payload: JSON.stringify({ calc, request: body }),
  });

  const templatePath = path.join(process.cwd(), "src/server/assets/bang-bao-gia.xlsx");
  const template = await readFile(templatePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Quote template sheet missing");
  }

  fillQuoteSheet(sheet, calc, body);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = new Uint8Array(arrayBuffer as ArrayBuffer);
  const language = normalizeLanguage(body.language);
  return {
    buffer,
    filename: `quote-${language}.xlsx`,
  };
}

function normalizeLanguage(language?: string) {
  const code = (language ?? "vi").trim().toLowerCase();
  if (code.startsWith("en")) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("ja")) return "ja";
  return "vi";
}

function fillQuoteSheet(
  sheet: ExcelJS.Worksheet,
  calc: CostBreakdown,
  body: { customerName?: string; customerAddress?: string; color?: string },
) {
  setCell(sheet, "B6", body.customerName?.trim() || "Khách hàng");
  setCell(sheet, "B7", body.customerAddress ?? "");
  setCell(sheet, "B8", calc.vehicleName);
  setCell(sheet, "B9", body.color ?? "");
  setCell(sheet, "B10", calc.locationName);
  setCell(sheet, "D12", calc.listPrice);
  setCell(sheet, "D13", calc.discountAmount ?? 0);
  setCell(sheet, "D14", calc.salePrice ?? calc.listPrice);
  setCell(sheet, "D30", calc.estimatedOnRoadTotal);
  setCell(sheet, "D31", calc.deposit ?? 0);

  let row = 18;
  for (const fee of calc.fees.filter((line) => line.includedInTotal)) {
    setCell(sheet, `B${row}`, fee.name);
    setCell(sheet, `D${row}`, fee.amount);
    row += 1;
  }
}

function setCell(sheet: ExcelJS.Worksheet, address: string, value: string | number) {
  const cell = sheet.getCell(address);
  cell.value = value;
}
