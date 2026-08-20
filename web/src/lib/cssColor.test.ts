import { describe, expect, it } from "vitest";

import { cssContainsUnsupportedColor, rewriteCssColorFunctions } from "./cssColor";

describe("rewriteCssColorFunctions", () => {
  it("replaces nested oklch inside color-mix so html2canvas never sees those functions", () => {
    const css = "background: color-mix(in oklab, oklch(0.7 0.15 40) 50%, white);";
    const rewritten = rewriteCssColorFunctions(css, () => "rgb(0, 0, 0)");
    expect(cssContainsUnsupportedColor(rewritten)).toBe(false);
    expect(rewritten).toContain("rgb(0, 0, 0)");
    expect(rewritten).not.toMatch(/oklch|oklab|color-mix/i);
  });

  it("replaces nested lab inside declarations so html2canvas never sees those functions", () => {
    const css = "border-color: lab(11.7579 0.00000745058 0.00000298023 / 0.4);";
    const rewritten = rewriteCssColorFunctions(css, () => "rgba(30, 30, 30, 0.4)");
    expect(cssContainsUnsupportedColor(rewritten)).toBe(false);
    expect(rewritten).toContain("rgba(30, 30, 30, 0.4)");
    expect(rewritten).not.toMatch(/lab\(/i);
  });
  it("leaves hex and rgb declarations unchanged", () => {
    const css = "color: #e60012; border-color: rgb(31, 31, 31);";
    expect(rewriteCssColorFunctions(css, () => "FAIL")).toBe(css);
    expect(cssContainsUnsupportedColor(css)).toBe(false);
  });
});
