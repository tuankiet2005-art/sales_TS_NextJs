import { readFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { fillQuoteWorkbook } from "./quote-sheet-fill";

const TEMPLATE = path.join(process.cwd(), "src/server/assets/bang-bao-gia.xlsx");

function cellText(sheet: ExcelJS.Worksheet, address: string): string {
  const value = sheet.getCell(address).value;
  if (value == null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part: { text: string }) => part.text).join("");
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text;
  }
  if (typeof value === "object" && "result" in value) {
    return String(value.result ?? "");
  }
  return String(value);
}

describe("fillQuoteWorkbook", () => {
  it("fills the Attrage CVT dealer sheet by labels without smashing gifts or the first Xpander tab", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await readFile(TEMPLATE));

    fillQuoteWorkbook(workbook, {
      language: "vi",
      customerName: "Nguyễn Văn Định",
      customerAddress: "123 Thủ Đức",
      color: "Đỏ",
      quoteSheetName: "Attrage CVT",
      vehicleName: "Attrage CVT",
      model: "Attrage",
      modelYear: 2024,
      deliveryNote: "T2/2025",
      listPrice: 111000000,
      discountAmount: 5000000,
      salePrice: 106000000,
      fees: [
        { code: "REGISTRATION_TAX", name: "Thuế trước bạ", amount: 11100000, includedInTotal: true },
        { code: "LICENSE_PLATE", name: "Phí biển", amount: 20000000, includedInTotal: true },
      ],
      totalMandatoryFees: 31100000,
      totalOptionalFees: 0,
      accessoriesTotal: 1500000,
      estimatedOnRoadTotal: 138600000,
      deposit: 20000000,
      accessories: [{ name: "Thảm lót", amount: 1500000 }],
    });

    const sheet = workbook.getWorksheet("Attrage CVT");
    expect(sheet).toBeDefined();
    expect(sheet?.state).toBe("visible");
    expect(workbook.getWorksheet("Xpander MT")?.state).toBe("hidden");

    expect(cellText(sheet!, "A6")).toContain("Khách hàng:");
    expect(cellText(sheet!, "A6")).toContain("Nguyễn Văn Định");
    expect(cellText(sheet!, "A7")).toContain("Địa chỉ:");
    expect(cellText(sheet!, "A7")).toContain("123 Thủ Đức");
    expect(cellText(sheet!, "B8")).toBe("Attrage CVT");
    expect(sheet!.getCell("B9").value).toBe(111000000);
    expect(sheet!.getCell("B10").value).toBe(5000000);
    expect(cellText(sheet!, "G9")).toContain("Đỏ");
    expect(cellText(sheet!, "D12")).toMatch(/Quà Tặng/i);
    expect(sheet!.getCell("B13").value).toBe(11100000);
    expect(cellText(sheet!, "D13")).not.toMatch(/^\d+$/);
    expect(cellText(sheet!, "D23")).toMatch(/TỔNG CP PHÁT SINH/);
    expect(sheet!.getCell("F23").value).toBe(1500000);
  });
});
