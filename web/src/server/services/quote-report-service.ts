import { loadQuoteTemplateWorkbook } from "./quote-report-path";
import { fillQuoteWorkbook, resolveQuoteSheet, type QuoteSheetFillInput } from "./quote-sheet-fill";
import { worksheetToView } from "./quote-sheet-model";
import type { QuoteSaveRequest } from "./quote-history-service";
import type { QuoteSheetView } from "@/lib/quoteSheetView";

import { resolveQuoteCalculation } from "./catalog-service";

export function quoteSheetFillInput(
  body: QuoteSaveRequest,
  calc: {
    listPrice: number;
    discountAmount?: number;
    salePrice?: number;
    fees: QuoteSheetFillInput["fees"];
    totalMandatoryFees: number;
    totalOptionalFees: number;
    accessoriesTotal?: number;
    estimatedOnRoadTotal: number;
    deposit?: number;
    accessories?: { name: string; amount: number }[];
  },
  vehicle: {
    name: string;
    model?: string;
    modelYear?: number | null;
    quoteSheetName?: string | null;
    deliveryNote?: string | null;
    gifts?: string | null;
    warrantyNote?: string | null;
    defaultColor?: string | null;
    availableColors?: string | null;
    colorPhotos?: string | null;
  },
): QuoteSheetFillInput {
  return {
    language: body.language,
    customerName: body.customerName,
    customerAddress: body.customerAddress,
    color: body.color || vehicle.defaultColor || "",
    quoteSheetName: vehicle.quoteSheetName,
    vehicleName: vehicle.name,
    model: vehicle.model,
    modelYear: vehicle.modelYear,
    deliveryNote: vehicle.deliveryNote,
    gifts: vehicle.gifts,
    warrantyNote: vehicle.warrantyNote,
    listPrice: calc.listPrice,
    discountAmount: calc.discountAmount ?? 0,
    salePrice: calc.salePrice ?? calc.listPrice,
    fees: calc.fees,
    totalMandatoryFees: calc.totalMandatoryFees,
    totalOptionalFees: calc.totalOptionalFees,
    accessoriesTotal: calc.accessoriesTotal ?? 0,
    estimatedOnRoadTotal: calc.estimatedOnRoadTotal,
    deposit: calc.deposit ?? 0,
    bankLoan: body.bankLoan,
    accessories: calc.accessories,
  };
}

export async function buildQuoteReportView(body: QuoteSaveRequest): Promise<QuoteSheetView | null> {
  const calcResult = await resolveQuoteCalculation(body, body.breakdown);
  if (!calcResult || "error" in calcResult) {
    return null;
  }
  const { data: calc, vehicleRow } = calcResult;
  const workbook = await loadQuoteTemplateWorkbook();
  const input = quoteSheetFillInput(body, calc, vehicleRow.vehicle);
  fillQuoteWorkbook(workbook, input);
  const sheet = resolveQuoteSheet(workbook, input.quoteSheetName, input.vehicleName, input.model);
  if (!sheet) {
    return null;
  }
  return worksheetToView(workbook, sheet);
}
