import { describe, expect, it } from "vitest";

import { translateQuoteLabel } from "@onroad/shared/quote/quoteLabels";

describe("translateQuoteLabel", () => {
  it("matches labels when template text contains line breaks", () => {
    const source =
      "Quý khách đặt cọc và ký hợp đồng chúng tôi sẽ tiến hành thẩm\n định và làm hồ sơ ngân hàng, trường hợp ngân hàng không đồng ý cho vay, chúng tôi sẽ hoàn lại 100% tiền cọc";
    expect(translateQuoteLabel(source, "en")).toContain("After deposit");
    expect(translateQuoteLabel(source, "zh")).toContain("客户支付定金");
    expect(translateQuoteLabel(source, "ja")).toContain("ご契約");
  });

  it("expands Vietnamese abbreviations when language is vi", () => {
    expect(translateQuoteLabel("XÁC NHẬN TVBH", "vi")).toBe("XÁC NHẬN TƯ VẤN BÁN HÀNG");
  });
});
