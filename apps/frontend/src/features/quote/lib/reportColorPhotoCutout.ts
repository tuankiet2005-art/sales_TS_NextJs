const cutoutCache = new Map<string, string>();

function cacheKey(src: string) {
  return src.trim();
}

/** Load a quote color photo with background removed in-browser when the server skipped it. */
export async function loadReportColorPhotoCutout(reportSrc: string, fallbackSrc: string): Promise<string> {
  const key = cacheKey(reportSrc);
  const cached = cutoutCache.get(key);
  if (cached) {
    return cached;
  }

  const response = await fetch(reportSrc);
  if (!response.ok) {
    throw new Error(`report color photo fetch failed: ${response.status}`);
  }

  const blob = await response.blob();
  const bgRemovedOnServer = response.headers.get("X-Report-Bg-Removed") === "1";
  const displayBlob = bgRemovedOnServer ? blob : await removeBackgroundInBrowser(blob);
  const url = URL.createObjectURL(displayBlob);
  cutoutCache.set(key, url);
  return url;
}

async function removeBackgroundInBrowser(blob: Blob): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(blob, {
    model: "isnet",
    output: {
      format: "image/png",
      quality: 1,
    },
  });
}

export function releaseReportColorPhotoCutouts() {
  for (const url of cutoutCache.values()) {
    URL.revokeObjectURL(url);
  }
  cutoutCache.clear();
}
