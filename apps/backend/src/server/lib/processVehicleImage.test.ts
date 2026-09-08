import { afterEach, describe, expect, it, vi } from "vitest";

describe("processReportColorPhotoBuffer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("skips background removal on Windows unless REPORT_COLOR_BG_REMOVAL is enabled", async () => {
    vi.stubEnv("REPORT_COLOR_BG_REMOVAL", undefined);
    vi.doMock("node:process", () => ({ platform: "win32" }));
    const platform = vi.spyOn(process, "platform", "get").mockReturnValue("win32");

    const removeBackground = vi.fn();
    vi.doMock("@imgly/background-removal-node", () => ({ removeBackground }));
    vi.doMock("sharp", () => ({
      default: vi.fn(() => ({
        rotate: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("webp")),
      })),
    }));

    const { processReportColorPhotoBuffer } = await import("./processVehicleImage");
    const result = await processReportColorPhotoBuffer(Buffer.from("source"));

    expect(result.toString()).toBe("webp");
    expect(removeBackground).not.toHaveBeenCalled();
    platform.mockRestore();
  });
});
