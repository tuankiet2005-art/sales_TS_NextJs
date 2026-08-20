export function webpFileName(sourceName: string): string {
  const base = sourceName.replace(/\.[^.]+$/, "") || "image";
  return `${base}.webp`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = src;
  });
}

/** Convert a user-selected image to WebP in the browser before upload. */
export async function convertImageFileToWebp(file: File, quality = 0.85): Promise<File> {
  if (file.type === "image/webp") {
    return file.name.toLowerCase().endsWith(".webp")
      ? file
      : new File([file], webpFileName(file.name), { type: "image/webp" });
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available");
    }
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });
    if (!blob) {
      throw new Error("WebP conversion failed");
    }
    return new File([blob], webpFileName(file.name), { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
