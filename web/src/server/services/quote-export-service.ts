import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

import { findActiveVehicleById } from "../db/repositories/catalog";
import { calculateOnRoad } from "./catalog-service";
import { fillQuoteWorkbook, normalizeLanguage } from "./quote-sheet-fill";
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
  const vehicleRow = await findActiveVehicleById(body.vehicleId);
  if (!vehicleRow) {
    return null;
  }

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
