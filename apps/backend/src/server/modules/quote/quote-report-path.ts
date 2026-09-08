import ExcelJS from "exceljs";

import { QUOTE_REPORT_TEMPLATE_BASE64 } from "./quote-template-buffer.js";

let cachedTemplate: Buffer | null = null;

export async function readQuoteTemplateBuffer() {
  if (!cachedTemplate) {
    cachedTemplate = Buffer.from(QUOTE_REPORT_TEMPLATE_BASE64, "base64");
  }
  return cachedTemplate;
}

export async function loadQuoteTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await readQuoteTemplateBuffer()) as unknown as ExcelJS.Buffer);
  return workbook;
}
