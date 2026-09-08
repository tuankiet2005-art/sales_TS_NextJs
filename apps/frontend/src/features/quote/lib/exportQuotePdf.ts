import { cssColorValueToRgb, cssContainsUnsupportedColor } from "@/features/shared/lib/cssColor";
import { waitForReportColorPhotos } from "./reportColorPhoto";
import { quoteSheetCaptureSize } from "./quoteSheetCellLayout";

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        image.complete ||
        new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

function rewriteUnsupportedInlineColors(root: HTMLElement) {
  const nodes = [root, ...root.querySelectorAll<HTMLElement>("*")];
  for (const node of nodes) {
    const declarations = [...node.style];
    for (const name of declarations) {
      const value = node.style.getPropertyValue(name);
      if (cssContainsUnsupportedColor(value)) {
        node.style.setProperty(name, cssColorValueToRgb(value));
      }
    }
  }
}

async function captureQuoteSheet(element: HTMLElement) {
  const { toCanvas } = await import("html-to-image");
  await waitForImages(element);
  await waitForReportColorPhotos(element);
  const { width, height } = quoteSheetCaptureSize(element);
  rewriteUnsupportedInlineColors(element);
  return toCanvas(element, {
    pixelRatio: 2,
    width,
    height,
    canvasWidth: Math.round(width * 2),
    canvasHeight: Math.round(height * 2),
    skipAutoScale: true,
    backgroundColor: "#ffffff",
    cacheBust: true,
    style: {
      transform: "none",
      transformOrigin: "top left",
      width: `${width}px`,
      height: `${height}px`,
    },
  });
}

export async function downloadQuotePng(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureQuoteSheet(element);
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG capture unavailable"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

export async function downloadQuotePdf(element: HTMLElement, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const canvas = await captureQuoteSheet(element);

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const pxPerMm = canvas.width / contentWidth;
  const pageHeightPx = contentHeight * pxPerMm;
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  if (canvas.height <= pageHeightPx) {
    const imgHeight = canvas.height / pxPerMm;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.93), "JPEG", margin, margin, contentWidth, imgHeight);
    pdf.save(filename);
    return;
  }

  const pageCanvas = document.createElement("canvas");
  const pageCtx = pageCanvas.getContext("2d");
  if (!pageCtx) {
    throw new Error("PDF canvas unavailable");
  }
  pageCanvas.width = canvas.width;
  pageCanvas.height = Math.ceil(pageHeightPx);

  let y = 0;
  let first = true;
  while (y < canvas.height) {
    pageCtx.fillStyle = "#ffffff";
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    const slicePx = Math.min(pageHeightPx, canvas.height - y);
    pageCtx.drawImage(canvas, 0, y, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
    if (!first) {
      pdf.addPage();
    }
    first = false;
    pdf.addImage(
      pageCanvas.toDataURL("image/jpeg", 0.93),
      "JPEG",
      margin,
      margin,
      contentWidth,
      slicePx / pxPerMm,
    );
    y += pageHeightPx;
  }
  pdf.save(filename);
}
