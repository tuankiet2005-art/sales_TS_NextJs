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
    expect(sheet!.getCell("B11").value).toEqual(expect.objectContaining({ formula: expect.stringMatching(/B9-B10/) }));
    expect(cellText(sheet!, "D12")).toMatch(/Quà Tặng/i);
    expect(cellText(sheet!, "D17")).toMatch(/CHI PHÍ PHÁT SINH THÊM/i);
    expect(cellText(sheet!, "D13")).toBe("Bao tay lái");
    expect(cellText(sheet!, "F13")).toBe("Phim cách nhiệt");
    expect(cellText(sheet!, "D14")).toBe("02 gối đầu");
    expect(cellText(sheet!, "A16")).toMatch(/Bảo hiểm TNDS/i);
    expect(cellText(sheet!, "A17")).toMatch(/Phí sử dụng đường bộ/i);
    expect(cellText(sheet!, "A20")).toMatch(/Phí dịch vụ đăng ký xe/i);
  });

  it("shows blank accessory rows with total last when there are no accessories", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
    fillQuoteWorkbook(workbook, {
      language: "vi",
      vehicleName: "Xpander Eco",
      listPrice: 111000000,
      discountAmount: 5000000,
      salePrice: 106000000,
      fees: [],
      totalMandatoryFees: 0,
      totalOptionalFees: 0,
      accessoriesTotal: 0,
      estimatedOnRoadTotal: 106000000,
      deposit: 0,
      accessories: [],
    });
    const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
    expect(cellText(sheet!, "D18")).toBe("");
    expect(cellText(sheet!, "F18")).toBe("");
    expect(cellText(sheet!, "D19")).toBe("");
    expect(cellText(sheet!, "D20")).toBe("");
    expect(cellText(sheet!, "F20")).toBe("");
    expect(cellText(sheet!, "D21")).toBe("");
    expect(cellText(sheet!, "D22")).toBe("");
    expect(cellText(sheet!, "D23")).toMatch(/TỔNG (CP|CHI PHÍ) PHÁT SINH/i);
    expect(sheet!.getCell("F23").value).toBe(0);
    expect(cellText(sheet!, "A24")).toMatch(/PHƯƠNG ÁN:\s*MUA TIỀN MẶT/i);
  });

  it("shows dashcam only when selected with quote label and price on the same row", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
    fillQuoteWorkbook(workbook, {
      language: "vi",
      vehicleName: "Xpander Eco",
      listPrice: 111000000,
      discountAmount: 5000000,
      salePrice: 106000000,
      fees: [],
      totalMandatoryFees: 0,
      totalOptionalFees: 0,
      accessoriesTotal: 2490000,
      estimatedOnRoadTotal: 108490000,
      deposit: 0,
      accessories: [{ name: "Camera hành trình / hộp đen", amount: 2490000 }],
    });
    const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
    expect(cellText(sheet!, "D18")).toBe("Camera hành trình (Hộp đen)");
    expect(sheet!.getCell("F18").value).toBe(2490000);
    expect(cellText(sheet!, "D19")).toBe("");
    expect(cellText(sheet!, "D23")).toMatch(/TỔNG (CP|CHI PHÍ) PHÁT SINH/i);
    expect(sheet!.getCell("F23").value).toBe(2490000);
  });

  it("writes each accessory on its own row with name left and price right", async () => {
    const { sheet } = await filledSheet();
    expect(cellText(sheet!, "D18")).toBe("Thảm lót");
    expect(sheet!.getCell("F18").value).toBe(1500000);
    expect(cellText(sheet!, "D19")).toBe("");
    expect(cellText(sheet!, "D20")).toBe("");
    expect(cellText(sheet!, "D23")).toMatch(/TỔNG (CP|CHI PHÍ) PHÁT SINH/i);
    expect(sheet!.getCell("F23").value).toBe(1500000);
    expect(cellText(sheet!, "A24")).toMatch(/PHƯƠNG ÁN:\s*MUA TIỀN MẶT/i);
  });

  it("writes multiple accessories on separate rows before the total", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
    fillQuoteWorkbook(workbook, {
      language: "vi",
      vehicleName: "Xpander Eco",
      listPrice: 111000000,
      discountAmount: 5000000,
      salePrice: 106000000,
      fees: [],
      totalMandatoryFees: 0,
      totalOptionalFees: 0,
      accessoriesTotal: 5280000,
      estimatedOnRoadTotal: 138600000,
      deposit: 20000000,
      accessories: [
        { name: "Bình chữa cháy", amount: 280000 },
        { name: "Dán VET", amount: 5000000 },
      ],
    });
    const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
    expect(cellText(sheet!, "D18")).toBe("Bình chữa cháy");
    expect(sheet!.getCell("F18").value).toBe(280000);
    expect(cellText(sheet!, "D19")).toBe("Dán VET");
    expect(sheet!.getCell("F19").value).toBe(5000000);
    expect(cellText(sheet!, "D20")).toBe("");
    expect(cellText(sheet!, "D23")).toMatch(/TỔNG (CP|CHI PHÍ) PHÁT SINH/i);
    expect(sheet!.getCell("F23").value).toBe(5280000);
    expect(cellText(sheet!, "A24")).toMatch(/PHƯƠNG ÁN:\s*MUA TIỀN MẶT/i);
  });

  it("keeps the accessory total row when four or more accessories are selected", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
    fillQuoteWorkbook(workbook, {
      language: "vi",
      vehicleName: "Xpander Eco",
      listPrice: 111000000,
      discountAmount: 5000000,
      salePrice: 106000000,
      fees: [],
      totalMandatoryFees: 0,
      totalOptionalFees: 0,
      accessoriesTotal: 11090000,
      estimatedOnRoadTotal: 117090000,
      deposit: 0,
      accessories: [
        { name: "Bình chữa cháy", amount: 280000 },
        { name: "Dán VETC", amount: 720000 },
        { name: "Camera 360", amount: 9500000 },
        { name: "Bao tay lái", amount: 450000 },
      ],
    });
    const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
    expect(cellText(sheet!, "D18")).toBe("Bình chữa cháy");
    expect(cellText(sheet!, "D19")).toBe("Dán VETC");
    expect(cellText(sheet!, "D20")).toBe("Camera 360");
    expect(cellText(sheet!, "D21")).toBe("Bao tay lái");
    expect(cellText(sheet!, "D22")).toBe("");
    expect(cellText(sheet!, "D23")).toMatch(/TỔNG (CP|CHI PHÍ) PHÁT SINH/i);
    expect(sheet!.getCell("F23").value).toBe(11090000);
    expect(cellText(sheet!, "A24")).toMatch(/PHƯƠNG ÁN:\s*MUA TIỀN MẶT/i);

    const view = worksheetToView(workbook, sheet!);
    const accessoryTotal = view.cells.find((cell) => /^TỔNG (CP|CHI PHÍ) PHÁT SINH/i.test(cell.text));
    expect(accessoryTotal).toBeDefined();
    const lastAccessoryPrice = view.cells.find(
      (cell) => cell.r === accessoryTotal!.r - 1 && cell.c === 6 && cell.colspan === 2,
    );
    expect(lastAccessoryPrice?.style.borderRight).toMatch(/solid/);
  });

  it("inserts accessory-only rows with empty left columns when there are many accessories", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
    fillQuoteWorkbook(workbook, {
      language: "vi",
      vehicleName: "Xpander Cross",
      listPrice: 699000000,
      discountAmount: 34950000,
      salePrice: 664050000,
      fees: [{ code: "REGISTRATION_TAX", amount: 98533400, includedInTotal: true }],
      totalMandatoryFees: 98533400,
      totalOptionalFees: 0,
      accessoriesTotal: 15120000,
      estimatedOnRoadTotal: 762583400,
      deposit: 20000000,
      accessories: [
        { name: "Camera 360", amount: 9500000 },
        { name: "Dán VETC", amount: 720000 },
        { name: "Bình chữa cháy", amount: 280000 },
        { name: "Áo trùm xe", amount: 850000 },
        { name: "Phủ gầm", amount: 2800000 },
        { name: "Bao tay lái", amount: 450000 },
      ],
    });
    const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
    const accessoryRows = [18, 19, 20, 21, 22, 23].map((row) => cellText(sheet!, `D${row}`));
    expect(accessoryRows).toEqual([
      "Camera 360",
      "Dán VETC",
      "Bình chữa cháy",
      "Áo trùm xe",
      "Phủ gầm",
      "Bao tay lái",
    ]);
    expect(cellText(sheet!, "A23")).toBe("");
    expect(cellText(sheet!, "A16")).toMatch(/Bảo hiểm TNDS/i);
    expect(cellText(sheet!, "D18")).not.toMatch(/Phụ kiện trang bị thêm/i);
    let registrationTotalRows = 0;
    sheet!.eachRow((row) => {
      row.eachCell((cell) => {
        const text = cellText(sheet!, cell.address);
        if (text.includes("Tổng Chi Phí Đăng ký xe")) {
          registrationTotalRows += 1;
        }
      });
    });
    expect(registrationTotalRows).toBe(1);
  });

  it("keeps template car placeholders out of the payment-plan area when rows are inserted", async () => {
    const accessories = Array.from({ length: 6 }, (_, index) => ({
      name: `Accessory ${index + 1}`,
      amount: (index + 1) * 100000,
    }));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
    fillQuoteWorkbook(workbook, {
      language: "vi",
      vehicleName: "Xpander Cross",
      listPrice: 699000000,
      discountAmount: 34950000,
      salePrice: 664050000,
      fees: [{ code: "REGISTRATION_TAX", amount: 98533400, includedInTotal: true }],
      totalMandatoryFees: 98533400,
      totalOptionalFees: 0,
      accessoriesTotal: accessories.reduce((sum, item) => sum + item.amount, 0),
      estimatedOnRoadTotal: 762583400,
      deposit: 20000000,
      accessories,
    });
    const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
    const view = worksheetToView(workbook, sheet!);
    expect(view.images.length).toBeLessThanOrEqual(1);
  });

  it("keeps payment-plan and signature rows from duplicating in the rendered view", async () => {
    const accessories = Array.from({ length: 6 }, (_, index) => ({
      name: `Accessory ${index + 1}`,
      amount: (index + 1) * 100000,
    }));

    async function filledView(accessoryCount: number) {
      const items =
        accessoryCount === 0
          ? []
          : accessories.slice(0, accessoryCount);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
      fillQuoteWorkbook(workbook, {
        language: "vi",
        vehicleName: "Xpander Cross",
        listPrice: 699000000,
        discountAmount: 34950000,
        salePrice: 664050000,
        fees: [{ code: "REGISTRATION_TAX", amount: 98533400, includedInTotal: true }],
        totalMandatoryFees: 98533400,
        totalOptionalFees: 0,
        accessoriesTotal: items.reduce((sum, item) => sum + item.amount, 0),
        estimatedOnRoadTotal: 762583400,
        deposit: 20000000,
        accessories: items,
      });
      const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
      return worksheetToView(workbook, sheet!);
    }

    const baseline = await filledView(0);
    const filled = await filledView(6);
    const cashPlan = (view: ReturnType<typeof worksheetToView>) =>
      view.cells.filter((cell) => cell.text.includes("PHƯƠNG ÁN: MUA TIỀN MẶT"));
    const confirm = (view: ReturnType<typeof worksheetToView>) =>
      view.cells.filter((cell) => cell.text.includes("XÁC NHẬN TVBH"));

    expect(cashPlan(filled).length).toBe(cashPlan(baseline).length);
    expect(confirm(filled).length).toBe(confirm(baseline).length);
    expect(filled.rows.length).toBe(baseline.rows.length + 1);

    const giftHeader = baseline.cells.find((cell) => /quà tặng/i.test(cell.text));
    const accessoryHeader = baseline.cells.find((cell) => /CHI PHÍ PHÁT SINH THÊM/i.test(cell.text));
    expect(giftHeader?.r).toBeDefined();
    expect(accessoryHeader?.r).toBeDefined();
    expect(accessoryHeader!.r - giftHeader!.r).toBe(5);
  });

  it("formats accessory prices consistently in the rendered view", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
    fillQuoteWorkbook(workbook, {
      language: "vi",
      vehicleName: "Xpander Eco",
      listPrice: 111000000,
      discountAmount: 5000000,
      salePrice: 106000000,
      fees: [],
      totalMandatoryFees: 0,
      totalOptionalFees: 0,
      accessoriesTotal: 9790000,
      estimatedOnRoadTotal: 115790000,
      deposit: 0,
      accessories: [
        { name: "Phim cách nhiệt", amount: 4500000 },
        { name: "Thảm lót sàn Tappi", amount: 1190000 },
        { name: "Bao tay lái", amount: 450000 },
        { name: "Phủ gầm", amount: 2800000 },
        { name: "Áo trùm xe", amount: 850000 },
      ],
    });
    const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
    const view = worksheetToView(workbook, sheet!);
    const accessoryHeader = view.cells.find((cell) => /CHI PHÍ PHÁT SINH THÊM/i.test(cell.text));
    expect(accessoryHeader?.r).toBeDefined();
    const accessoryTotal = view.cells.find((cell) => /^TỔNG (CP|CHI PHÍ) PHÁT SINH/i.test(cell.text));
    const accessoryPrices = view.cells.filter(
      (cell) =>
        cell.c === 6 &&
        cell.r > accessoryHeader!.r &&
        cell.r < (accessoryTotal?.r ?? accessoryHeader!.r + 8) &&
        cell.text.trim().length > 0 &&
        /^\d{1,3}(\.\d{3})*$/.test(cell.text),
    );
    expect(accessoryPrices.length).toBeGreaterThanOrEqual(5);
    for (const cell of accessoryPrices) {
      expect(cell.text).toMatch(/^\d{1,3}(\.\d{3})*$/);
      expect(cell.style.fontSize).toBe(14);
      expect(cell.style.color).toBe("#1f1f1f");
      expect(cell.style.fontWeight).not.toBe(700);
    }
  });

  it("keeps the right border on the row above the accessory total", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await readFile(TEMPLATE)) as unknown as ExcelJS.Buffer);
    fillQuoteWorkbook(workbook, {
      language: "vi",
      vehicleName: "Xpander Eco",
      listPrice: 111000000,
      discountAmount: 5000000,
      salePrice: 106000000,
      fees: [],
      totalMandatoryFees: 0,
      totalOptionalFees: 0,
      accessoriesTotal: 0,
      estimatedOnRoadTotal: 106000000,
      deposit: 0,
      accessories: [],
    });
    const sheet = workbook.worksheets.find((item) => item.state === "visible") ?? workbook.worksheets[0];
    const view = worksheetToView(workbook, sheet!);
    const total = view.cells.find((cell) => /TỔNG CHI PHÍ PHÁT SINH/i.test(cell.text));
    expect(total?.r).toBeDefined();
    const priceCellAboveTotal = view.cells.find(
      (cell) => cell.r === total!.r - 1 && cell.c === 6 && cell.colspan === 2,
    );
    expect(priceCellAboveTotal?.style.borderRight).toMatch(/solid/);
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
    expect(view.width).toBeGreaterThan(1300);
    expect(view.width).toBeLessThan(1450);
    expect(Math.max(...view.cells.map((cell) => cell.r))).toBe(37);
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
    const giftHeader = view.cells.find((cell) => /quà tặng/i.test(cell.text));
    expect(giftHeader?.style.textAlign).toBe("center");
    expect(giftHeader?.style.color?.toLowerCase()).toBe("#ff0000");
    expect(giftHeader?.style.fontWeight).toBe(700);
    const accessoryHeader = view.cells.find((cell) => /CHI PHÍ PHÁT SINH THÊM/i.test(cell.text));
    expect(accessoryHeader?.style.textAlign).toBe("center");
    expect(accessoryHeader?.style.color?.toLowerCase()).toBe("#ff0000");
    expect(accessoryHeader?.style.fontWeight).toBe(700);
    const loanTermYears = view.cells.find((cell) => cell.text === "5 Năm");
    const loanTermMonths = view.cells.find((cell) => cell.text === "60");
    const loanTermAmount = view.cells.find((cell) => cell.r === loanTermYears?.r && cell.c === 7);
    const monthlyPaymentRow = view.cells.find((cell) => cell.text === "Thanh toán tháng");
    const monthlyPaymentTotal = view.cells.find((cell) => cell.r === monthlyPaymentRow?.r && cell.c === 7);
    expect(loanTermYears?.style.textAlign).toBe("center");
    expect(loanTermMonths?.style.textAlign).toBe("center");
    expect(loanTermAmount?.style.textAlign).toBe("center");
    expect(monthlyPaymentTotal?.style.textAlign).toBe("center");
    expect(giftHeader?.style.borderBottom).toMatch(/solid/);
    const titleCell = view.cells.find((cell) => cell.text.includes("BẢNG BÁO GIÁ CHI TIẾT"));
    expect(titleCell?.style.borderRight).toMatch(/solid/);
    const feeRow = view.cells.find((cell) => cell.r === 12 && cell.c === 1 && cell.text.includes("Phí bấm biển"));
    expect(feeRow).toBeDefined();
    expect(view.rows[11]).toBeGreaterThan(10);
    const customerSignCell = view.cells.find((cell) => cell.r === 35 && cell.c === 4);
    expect(customerSignCell?.style.borderRight).toMatch(/solid/);
  });
});
