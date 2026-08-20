import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

import { resolveQuoteCalculation } from "./catalog-service";
import { persistCalculatedQuote, type QuoteSaveRequest } from "./quote-history-service";
import { fillQuoteWorkbook, normalizeLanguage } from "./quote-sheet-fill";

export async function exportQuote(body: QuoteSaveRequest) {
  const calcResult = await resolveQuoteCalculation(body, body.breakdown);
  if (!calcResult || "error" in calcResult) {
    return null;
  }
  const { data: calc, vehicleRow } = calcResult;

  await persistCalculatedQuote(body, calc, vehicleRow.brand.code);

  const templatePath = path.join(process.cwd(), "src/server/assets/bang-bao-gia.xlsx");
  const template = await readFile(templatePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template as unknown as ExcelJS.Buffer);

  fillQuoteWorkbook(workbook, {
    language: body.language,
    customerName: body.customerName,
    customerAddress: body.customerAddress,
    color: body.color || vehicleRow.vehicle.defaultColor || "",
    quoteSheetName: vehicleRow.vehicle.quoteSheetName,
    vehicleName: vehicleRow.vehicle.name,
    model: vehicleRow.vehicle.model,
    modelYear: vehicleRow.vehicle.modelYear,
    deliveryNote: vehicleRow.vehicle.deliveryNote,
    listPrice: calc.listPrice,
    discountAmount: calc.discountAmount ?? 0,
    salePrice: calc.salePrice ?? calc.listPrice,
    fees: calc.fees,
    totalMandatoryFees: calc.totalMandatoryFees,
    totalOptionalFees: calc.totalOptionalFees,
    accessoriesTotal: calc.accessoriesTotal ?? 0,
    estimatedOnRoadTotal: calc.estimatedOnRoadTotal,
    deposit: calc.deposit ?? 0,
    accessories: calc.accessories,
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = new Uint8Array(arrayBuffer as ArrayBuffer);
  const language = normalizeLanguage(body.language);
  const model = (vehicleRow.vehicle.model || "quote").replace(/\s+/g, "-");
  return {
    buffer,
    filename: `quote-${model}-${language}.xlsx`,
  };
}
