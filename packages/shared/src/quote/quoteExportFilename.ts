const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|]/g;

function foldVietnamese(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (char) => (char === "đ" ? "d" : "D"));
}

function sanitizeFilenameSegment(value: string, fallback: string): string {
  const cleaned = value.trim().replace(UNSAFE_FILENAME_CHARS, "").replace(/\s+/g, "-");
  return cleaned || fallback;
}

function slugQuoteColor(color: string): string {
  const cleaned = foldVietnamese(color.trim())
    .toLowerCase()
    .replace(UNSAFE_FILENAME_CHARS, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned || "mau";
}

function formatQuoteExportDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Basename for quote exports, e.g. quote-Triton_trang-08.09.2026-vi */
export function buildQuoteExportBasename(input: {
  model: string;
  color?: string;
  language: string;
  date?: Date;
}): string {
  const modelPart = sanitizeFilenameSegment(input.model, "quote");
  const colorPart = slugQuoteColor(input.color ?? "");
  const datePart = formatQuoteExportDate(input.date ?? new Date());
  const languagePart = sanitizeFilenameSegment(input.language, "vi").toLowerCase();
  return `quote-${modelPart}_${colorPart}-${datePart}-${languagePart}`;
}

export function buildQuoteExportFilename(
  extension: "xlsx" | "pdf" | "png",
  input: {
    model: string;
    color?: string;
    language: string;
    date?: Date;
  },
): string {
  return `${buildQuoteExportBasename(input)}.${extension}`;
}
