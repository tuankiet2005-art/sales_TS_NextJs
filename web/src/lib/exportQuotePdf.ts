import { cssContainsUnsupportedColor, rewriteCssColorFunctions } from "./cssColor";

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        image.complete ||
        new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

function lockImageToReportBox(original: HTMLImageElement, clone: HTMLImageElement) {
  const box = original.getBoundingClientRect();
  const naturalWidth = original.naturalWidth || box.width || 1;
  const naturalHeight = original.naturalHeight || box.height || 1;
  const fit = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  clone.style.width = `${naturalWidth * fit}px`;
  clone.style.height = `${naturalHeight * fit}px`;
  clone.style.maxWidth = "none";
  clone.style.maxHeight = "none";
  clone.style.objectFit = "fill";
  clone.style.objectPosition = "center";
  clone.style.display = "block";
  clone.style.marginLeft = "auto";
  clone.style.marginRight = "auto";
  clone.removeAttribute("class");
}

function cssColorToRgb(value: string): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return rewriteCssColorFunctions(value, () => "#000000");
  }
  return rewriteCssColorFunctions(value, (fn) => {
    try {
      ctx.fillStyle = "#000000";
      ctx.fillStyle = fn;
      const out = ctx.fillStyle;
      return typeof out === "string" && out.length > 0 ? out : "#000000";
    } catch {
      return "#000000";
    }
  });
}

function inlineComputedStyles(originalRoot: HTMLElement, cloneRoot: HTMLElement) {
  const originals = [originalRoot, ...originalRoot.querySelectorAll<HTMLElement>("*")];
  const clones = [cloneRoot, ...cloneRoot.querySelectorAll<HTMLElement>("*")];
  const count = Math.min(originals.length, clones.length);
  for (let i = 0; i < count; i += 1) {
    const original = originals[i];
    const clone = clones[i];
    const computed = getComputedStyle(original);
    for (const name of computed) {
      let value = computed.getPropertyValue(name);
      if (cssContainsUnsupportedColor(value)) {
        value = cssColorToRgb(value);
      }
      clone.style.setProperty(name, value);
    }
  }
}

function neutralizeModernCss(clonedDoc: Document, original: HTMLElement, clone: HTMLElement) {
  inlineComputedStyles(original, clone);
  clonedDoc.querySelectorAll("style").forEach((node) => {
    if (node.textContent && cssContainsUnsupportedColor(node.textContent)) {
      node.textContent = cssColorToRgb(node.textContent);
    }
  });
  clonedDoc.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => node.remove());
}

export async function downloadQuotePdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  await waitForImages(element);
  const width = Math.ceil(element.getBoundingClientRect().width);
  const canvas = await html2canvas(element, {
    scale: 2,
    width,
    windowWidth: width,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone(clonedDoc, clone) {
      neutralizeModernCss(clonedDoc, element, clone);
      const originals = element.querySelectorAll("img");
      clone.querySelectorAll("img").forEach((image, index) => {
        const original = originals[index];
        if (original) {
          lockImageToReportBox(original, image);
        }
      });
    },
  });

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
      slicePx / pxPerMm
    );
    y += pageHeightPx;
  }
  pdf.save(filename);
}
