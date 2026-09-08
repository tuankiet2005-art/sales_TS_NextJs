import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildDocxTokens, fillQuoteDocument } from "./quote-docx-fill";
import { docxBufferToQuoteView } from "./quote-docx-preview";

const TEMPLATE = path.join(process.cwd(), "src/server/assets/quote-report/bang-bao-gia.docx");

const sampleInput = {
  language: "vi",
  customerName: "Nguyễn Văn Định",
  customerAddress: "123 Thủ Đức",
  color: "Đỏ",
  quoteSheetName: "Xpander Eco",
  vehicleName: "Xpander Eco",
  model: "Xpander",
  modelYear: 2024,
  deliveryNote: "T2/2025",
  gifts: "Bao tay lái; Phim cách nhiệt",
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
};

describe("fillQuoteDocument", () => {
  it("fills Word placeholders and preserves dealer layout styling", async () => {
    const template = await readFile(TEMPLATE);
    const tokens = buildDocxTokens(sampleInput);
    expect(tokens.customer_name).toBe("Nguyễn Văn Định");
    expect(tokens.gift_1).toBe("Bao tay lái");
    expect(tokens.car_model).toBe("Xpander Eco");

    const filled = await fillQuoteDocument(template, sampleInput);
    const view = docxBufferToQuoteView(filled);

    expect(view.cells.some((cell) => cell.text.includes("BẢNG BÁO GIÁ CHI TIẾT"))).toBe(true);
    expect(view.cells.some((cell) => cell.text.includes("Nguyễn Văn Định"))).toBe(true);
    expect(view.cells.some((cell) => cell.text.includes("Xpander Eco"))).toBe(true);
    expect(view.cells.some((cell) => cell.style.background === "#C6E0B4")).toBe(true);
    expect(view.colorGrid).toEqual(
      expect.objectContaining({
        left: expect.any(Number),
        top: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
    expect(view.columns.length).toBeGreaterThan(4);
    expect(view.rows.length).toBeGreaterThan(20);
    expect(view.images.length).toBeGreaterThan(0);
    expect(view.width).toBeGreaterThan(700);
  });
});
