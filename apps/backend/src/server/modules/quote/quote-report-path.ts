import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

export const QUOTE_REPORT_TEMPLATE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../assets/quote-report/bang-bao-gia.xlsx",
);

let cachedTemplate: { mtimeMs: number; buffer: Buffer } | null = null;

export async function readQuoteTemplateBuffer() {
  const info = await stat(QUOTE_REPORT_TEMPLATE);
  if (!cachedTemplate || cachedTemplate.mtimeMs !== info.mtimeMs) {
    cachedTemplate = { mtimeMs: info.mtimeMs, buffer: await readFile(QUOTE_REPORT_TEMPLATE) };
  }
  return cachedTemplate.buffer;
}

export async function loadQuoteTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await readQuoteTemplateBuffer()) as unknown as ExcelJS.Buffer);
  return workbook;
}
