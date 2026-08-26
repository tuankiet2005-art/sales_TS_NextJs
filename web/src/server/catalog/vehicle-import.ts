import fs from "node:fs/promises";
import path from "node:path";

import {
  FOLDER_TRIM_BY_MODEL_VERSION,
  seedByTrimName,
} from "./vehicle-seed-data";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const REGISTRATION_FOLDER_LABEL = "hinh dang ky xe";

export function normalizeFolderLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .trim();
}

async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function countParseableSourceImages(rootDir: string): Promise<number> {
  const images = await listSourceImages(rootDir);
  let count = 0;
  for (const sourcePath of images) {
    try {
      parseImageRecord(sourcePath, rootDir);
      count += 1;
    } catch {
      // Ignore files outside Model/Version layout.
    }
  }
  return count;
}

/** Resolve registration-photo root, tolerating NFC/NFD folder name differences on disk. */
export async function resolveVehicleImageSourceDir(requested?: string): Promise<string> {
  const candidates = new Set<string>();

  if (requested?.trim()) {
    candidates.add(path.resolve(requested.trim()));
  }

  const downloads = path.join(process.env.HOME ?? "/home/kayd", "Downloads");
  if (await directoryExists(downloads)) {
    const entries = await fs.readdir(downloads, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (normalizeFolderLabel(entry.name) !== REGISTRATION_FOLDER_LABEL) {
        continue;
      }
      const outer = path.join(downloads, entry.name);
      const nested = await fs.readdir(outer, { withFileTypes: true });
      for (const child of nested) {
        if (child.isDirectory()) {
          candidates.add(path.join(outer, child.name));
        }
      }
      candidates.add(outer);
    }
  }

  let bestDir: string | null = null;
  let bestCount = 0;
  for (const candidate of candidates) {
    if (!(await directoryExists(candidate))) {
      continue;
    }
    const count = await countParseableSourceImages(candidate);
    if (count > bestCount) {
      bestCount = count;
      bestDir = candidate;
    }
  }

  if (bestDir) {
    return bestDir;
  }

  const hint = requested?.trim() || "the registration-photo folder under Downloads";
  throw new Error(`No vehicle images found in ${hint}`);
}

/** Filename prefixes used in registration photos (longest match first per trim). */
const FILENAME_PREFIXES: Record<string, Record<string, string[]>> = {
  XPANDER: {
    ECO: ["XPANDER ECO"],
    PREMIUM: ["XPANDER PRE"],
    CROSS: ["XPANDER CROSS"],
  },
  XFORCE: {
    GLX: ["XFORCE GLX"],
    PREMIUM: ["XFORCE PRE"],
    ULTIMATE: ["XFORCE P2"],
  },
  TRITON: {
    GLX: ["TRITON GLX"],
    PREMIUM: ["TRITON PRE"],
    ATHLETE: ["TRITON ATHLETE"],
  },
  ATTRAGE: {
    MT: ["ATTRAGE MT"],
    PREMIUM: ["ATTRAGE PRE"],
  },
  DESTINATOR: {
    PREMIUM: ["DST PRE"],
    ULTIMATE: ["DST P2", "DST  P2"],
  },
};

const SINGLE_COLOR_MAP: Record<string, string> = {
  TRẮNG: "Trắng",
  ĐEN: "Đen",
  BẠC: "Bạc",
  XÁM: "Xám",
  NÂU: "Nâu",
  ĐỎ: "Đỏ",
  CAM: "Cam",
  VÀNG: "Vàng",
  XANH: "Xanh",
};

export interface ParsedColorImage {
  modelFolder: string;
  versionFolder: string;
  trimName: string;
  colorName: string;
  sourcePath: string;
}

export interface ImportVehicleRow {
  trimName: string;
  images: ParsedColorImage[];
  availableColors: string;
  defaultColor: string;
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseVietnamese(word: string): string {
  if (!word) {
    return word;
  }
  const lower = word.toLocaleLowerCase("vi-VN");
  return lower.charAt(0).toLocaleUpperCase("vi-VN") + lower.slice(1);
}

export function normalizeColorToken(raw: string): string {
  const cleaned = normalizeSpaces(raw.toUpperCase());
  if (!cleaned) {
    throw new Error("Empty color token");
  }

  const known = SINGLE_COLOR_MAP[cleaned];
  if (known) {
    return known;
  }

  const parts = cleaned.split(" ");
  if (parts.length === 2) {
    const first = SINGLE_COLOR_MAP[parts[0]] ?? titleCaseVietnamese(parts[0]);
    const second = SINGLE_COLOR_MAP[parts[1]] ?? titleCaseVietnamese(parts[1]);
    return `${first} ${second}`;
  }

  return titleCaseVietnamese(cleaned);
}

export function extractColorFromFilename(
  filename: string,
  modelFolder: string,
  versionFolder: string,
): string {
  const base = normalizeSpaces(path.basename(filename, path.extname(filename)));
  const prefixes = [...(FILENAME_PREFIXES[modelFolder]?.[versionFolder] ?? [])].sort(
    (a, b) => b.length - a.length,
  );

  for (const prefix of prefixes) {
    const pattern = new RegExp(`^${prefix.replace(/\s+/g, "\\s+")}\\s+`, "i");
    if (pattern.test(base)) {
      const remainder = base.replace(pattern, "").trim();
      if (remainder) {
        return normalizeColorToken(remainder);
      }
    }
  }

  throw new Error(`Could not parse color from filename "${filename}" (${modelFolder}/${versionFolder})`);
}

export function resolveTrimName(modelFolder: string, versionFolder: string): string {
  const trim = FOLDER_TRIM_BY_MODEL_VERSION[modelFolder]?.[versionFolder];
  if (!trim) {
    throw new Error(`Unknown model/version folder: ${modelFolder}/${versionFolder}`);
  }
  return trim;
}

export async function listSourceImages(rootDir: string): Promise<string[]> {
  const entries: string[] = [];

  async function walk(current: string) {
    const items = await fs.readdir(current, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        await walk(full);
        continue;
      }
      if (IMAGE_EXTENSIONS.has(path.extname(item.name).toLowerCase())) {
        entries.push(full);
      }
    }
  }

  await walk(rootDir);
  return entries.sort();
}

export function parseImageRecord(sourcePath: string, rootDir: string): ParsedColorImage {
  const relative = path.relative(rootDir, sourcePath);
  const segments = relative.split(path.sep);
  if (segments.length < 3) {
    throw new Error(`Expected Model/Version/file layout, got: ${relative}`);
  }

  const modelFolder = segments[0].toUpperCase();
  const versionFolder = segments[1].toUpperCase();
  const trimName = resolveTrimName(modelFolder, versionFolder);
  const colorName = extractColorFromFilename(path.basename(sourcePath), modelFolder, versionFolder);

  return {
    modelFolder,
    versionFolder,
    trimName,
    colorName,
    sourcePath,
  };
}

export function groupImagesByTrim(images: ParsedColorImage[]): ImportVehicleRow[] {
  const byTrim = new Map<string, ParsedColorImage[]>();
  for (const image of images) {
    const bucket = byTrim.get(image.trimName) ?? [];
    bucket.push(image);
    byTrim.set(image.trimName, bucket);
  }

  return [...byTrim.entries()].map(([trimName, rows]) => {
    const colors = [...new Set(rows.map((row) => row.colorName))];
    const seed = seedByTrimName(trimName);
    const defaultColor =
      seed?.defaultColor && colors.includes(seed.defaultColor) ? seed.defaultColor : colors[0];
    return {
      trimName,
      images: rows,
      availableColors: colors.join(","),
      defaultColor,
    };
  });
}

export async function readSourceImageBuffer(sourcePath: string): Promise<Buffer> {
  return fs.readFile(sourcePath);
}
