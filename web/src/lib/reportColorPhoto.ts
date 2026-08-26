/** Map a catalog color photo URL to the report-only background-removed endpoint. */
export function toReportColorPhotoSrc(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) {
    return "";
  }

  const fromApi = trimmed.match(/\/api\/vehicle-images\/(\d+)/);
  if (fromApi) {
    return `/api/report-color-photo/${fromApi[1]}?v=3`;
  }

  if (/^\d+$/.test(trimmed)) {
    return `/api/report-color-photo/${trimmed}?v=3`;
  }

  return trimmed;
}

export async function waitForReportColorPhotos(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img[data-report-color-photo]"));
  await Promise.all(
    images.map(
      (image) =>
        image.dataset.reportColorPhoto === "ready" ||
        image.complete ||
        new Promise<void>((resolve) => {
          const done = () => resolve();
          if (image.dataset.reportColorPhoto === "ready" || (image.complete && image.naturalWidth > 0)) {
            done();
            return;
          }
          const observer = new MutationObserver(() => {
            if (image.dataset.reportColorPhoto === "ready") {
              observer.disconnect();
              done();
            }
          });
          observer.observe(image, { attributes: true, attributeFilter: ["data-report-color-photo"] });
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        }),
    ),
  );
}
