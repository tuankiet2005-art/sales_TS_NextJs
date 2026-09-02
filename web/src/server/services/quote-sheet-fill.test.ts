import { readFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { fillQuoteWorkbook } from "./quote-sheet-fill";
import { evaluateSheetFormulas } from "./quote-sheet-formulas";
import { worksheetToView } from "./quote-sheet-model";

const TEMPLATE = path.join(process.cwd(), "src/server/assets/quote-report/bang-bao-gia.xlsx");

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
  if (typeof value === "object" && "formula" in value) {
    return `=${String(value.formula)}`;
  }
  return String(value);
}

async function filledSheet() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
  fillQuoteWorkbook(workbook, {
    language: "vi",
    customerName: "Nguyễn Văn Định",
    customerAddress: "123 Thủ Đức",
    color: "Đỏ",
    quoteSheetName: "Xpander Eco",
    vehicleName: "Xpander Eco",
    model: "Xpander",
    modelYear: 2024,
    deliveryNote: "T2/2025",
    gifts: "Bao tay lái; Phim cách nhiệt; 02 gối đầu",
    warrantyNote: "3 năm/100.000km",
    listPrice: 111000000,
    discountAmount: 5000000,
    salePrice: 106000000,
    fees: [
      { code: "REGISTRATION_TAX", amount: 11100000, includedInTotal: true },
      { code: "LICENSE_PLATE", amount: 20000000, includedInTotal: true },
    ],
    totalMandatoryFees: 31100000,
    totalOptionalFees: 0,
    accessoriesTotal: 1500000,
    estimatedOnRoadTotal: 138600000,
    deposit: 20000000,
    accessories: [{ name: "Thảm lót", amount: 1500000 }],
  });
  const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
  return { workbook, sheet };
}

describe("fillQuoteWorkbook", () => {
  it("fills {{tokens}} on the signed quote-report template and leaves formulas in place", async () => {
    const { sheet } = await filledSheet();
    expect(sheet).toBeDefined();
    expect(cellText(sheet!, "A6")).toContain("Khách hàng:");
    expect(cellText(sheet!, "A6")).toContain("Nguyễn Văn Định");
    expect(cellText(sheet!, "A7")).toContain("Địa chỉ:");
    expect(cellText(sheet!, "A7")).toContain("123 Thủ Đức");
    expect(cellText(sheet!, "D7")).toContain("TVBH:");
    expect(cellText(sheet!, "F7")).toContain("SĐT:");
    expect(cellText(sheet!, "B8")).toBe("Xpander Eco");
    expect(sheet!.getCell("B9").value).toBe(111000000);
    expect(sheet!.getCell("B10").value).toBe(5000000);
    expect(cellText(sheet!, "G9")).toContain("Đỏ");
    expect(cellText(sheet!, "D13")).toBe("Bao tay lái");
    expect(cellText(sheet!, "F13")).toBe("Phim cách nhiệt");
    expect(sheet!.getCell("B11").value).toEqual(expect.objectContaining({ formula: expect.stringMatching(/B9-B10/) }));
    expect(cellText(sheet!, "D12")).toMatch(/Quà Tặng/i);
  });

  it("evaluates sale price and builds a view that follows the workbook", async () => {
    const { workbook, sheet } = await filledSheet();
    const values = evaluateSheetFormulas(sheet!);
    expect(values.valueAt(11, 2)).toBe(106000000);
    const view = worksheetToView(workbook, sheet!);
    expect(view.cells.some((cell) => cell.text.includes("BẢNG BÁO GIÁ CHI TIẾT"))).toBe(true);
    expect(view.colorGrid).toEqual(
      expect.objectContaining({
        left: expect.any(Number),
        top: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
    expect(view.images.length).toBeGreaterThan(0);
    expect(view.width).toBeGreaterThan(1000);
    expect(view.width).toBeLessThan(1200);
    expect(Math.max(...view.cells.map((cell) => cell.r))).toBe(40);
    expect(Math.max(...view.cells.map((cell) => cell.c))).toBe(7);
    const titles = view.cells.filter((cell) => cell.text.includes("BẢNG BÁO GIÁ"));
    expect(titles).toHaveLength(1);
    expect(titles[0]?.style.fontSize).toBeGreaterThanOrEqual(18);
    expect(titles[0]?.style.fontFamily).toContain("Times New Roman");
    expect(sheet!.getImages().every((image) => (image.range.tl.nativeCol ?? 0) < 7)).toBe(true);
    expect(workbook.media.every((item) => item.buffer && item.buffer.length !== 8290)).toBe(true);
    const customerCell = view.cells.find((cell) => cell.r === 4 && cell.c === 1);
    expect(customerCell?.style.borderTop).toMatch(/solid/);
    expect(customerCell?.style.borderLeft).toMatch(/solid/);
    const giftHeader = view.cells.find((cell) => cell.r === 10 && cell.c === 4);
    expect(giftHeader?.style.borderBottom).toMatch(/solid/);
    const titleCell = view.cells.find((cell) => cell.text.includes("BẢNG BÁO GIÁ CHI TIẾT"));
    expect(titleCell?.style.borderRight).toMatch(/solid/);
    const customerSignCell = view.cells.find((cell) => cell.r === 38 && cell.c === 4);
    expect(customerSignCell?.style.borderRight).toMatch(/solid/);
  });
});
