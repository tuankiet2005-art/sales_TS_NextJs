import { persistCalculatedQuote, type QuoteSaveRequest } from "./quote-history-service";
import { resolveQuoteCalculation } from "./catalog-service";
import { loadQuoteTemplateWorkbook } from "./quote-report-path";
import { fillQuoteWorkbook, normalizeLanguage } from "./quote-sheet-fill";
import { quoteSheetFillInput } from "./quote-report-service";

export async function exportQuote(body: QuoteSaveRequest) {
  const calcResult = await resolveQuoteCalculation(body, body.breakdown);
  if (!calcResult || "error" in calcResult) {
    return null;
  }
  const { data: calc, vehicleRow } = calcResult;

  await persistCalculatedQuote(body, calc, vehicleRow.brand.code);

  const workbook = await loadQuoteTemplateWorkbook();
  fillQuoteWorkbook(workbook, quoteSheetFillInput(body, calc, vehicleRow.vehicle));

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = new Uint8Array(arrayBuffer as ArrayBuffer);
  const language = normalizeLanguage(body.language);
  const model = (vehicleRow.vehicle.model || "quote").replace(/\s+/g, "-");
  return {
    buffer,
    filename: `quote-${model}-${language}.xlsx`,
  };
}
