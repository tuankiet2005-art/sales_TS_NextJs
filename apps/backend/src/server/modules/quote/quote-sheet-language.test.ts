import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { fillQuoteWorkbook } from "./quote-sheet-fill";
import { worksheetToView } from "./quote-sheet-model";

const TEMPLATE = path.join(process.cwd(), "src/server/assets/quote-report/bang-bao-gia.xlsx");
const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const baseInput = {
  customerName: "Nguyễn Văn Định",
  customerAddress: "123 Thủ Đức",
  color: "Đỏ",
  quoteSheetName: "Xpander Eco",
  vehicleName: "Xpander Eco",
  model: "Xpander",
  listPrice: 111000000,
  discountAmount: 0,
  salePrice: 111000000,
  fees: [],
  totalMandatoryFees: 0,
  totalOptionalFees: 0,
  accessoriesTotal: 0,
  estimatedOnRoadTotal: 111000000,
  deposit: 0,
};

async function viewForLanguage(language: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
  fillQuoteWorkbook(workbook, { ...baseInput, language });
  const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
  return worksheetToView(workbook, sheet!);
}

describe("quote sheet language parity", () => {
  it("keeps the same cell count across export languages", async () => {
    const views = await Promise.all(["vi", "en", "zh", "ja"].map((language) => viewForLanguage(language)));
    const counts = views.map((view) => view.cells.length);
    expect(new Set(counts).size).toBe(1);
  });

  it("translates template labels for non-Vietnamese export languages", async () => {
    for (const language of ["en", "zh", "ja"]) {
      const view = await viewForLanguage(language);
      const vietnameseLabels = view.cells
        .map((cell) => cell.text)
        .filter(
          (text) =>
            text &&
            VIETNAMESE.test(text) &&
            !text.includes(baseInput.customerName) &&
            !text.includes(baseInput.customerAddress) &&
            !text.includes(baseInput.color),
        );
      expect(vietnameseLabels, `${language} still has untranslated labels`).toEqual([]);
    }
  });
});
