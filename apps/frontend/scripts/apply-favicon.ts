/**
 * Turn a dropped brand image into the OnRoad tab / home-screen icons.
 * Source: public/brand/favicon-drop/ (newest png, jpg, jpeg, webp, gif, or svg).
 * Output: src/app/icon.png and src/app/apple-icon.png; removes default favicon.ico.
 */
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dropDir = resolve(webRoot, "public/brand/favicon-drop");
const appDir = resolve(webRoot, "src/app");

const ALLOWED = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const SKIP = new Set([".gitkeep", ".ds_store"]);

export function findDroppedSource(): string | null {
  const names = readdirSync(dropDir).filter((name) => {
    if (SKIP.has(name.toLowerCase()) || name.startsWith(".")) {
      return false;
    }
    return ALLOWED.has(extname(name).toLowerCase());
  });
  if (names.length === 0) {
    return null;
  }
  names.sort(
    (a, b) =>
      statSync(resolve(dropDir, b)).mtimeMs - statSync(resolve(dropDir, a)).mtimeMs,
  );
  return resolve(dropDir, names[0]);
}

async function writeSquarePng(source: string, dest: string, size: number) {
  await sharp(source)
    .ensureAlpha()
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(dest);
}

export async function applyFavicon(source: string) {
  const iconPath = resolve(appDir, "icon.png");
  const applePath = resolve(appDir, "apple-icon.png");
  const icoPath = resolve(appDir, "favicon.ico");

  await writeSquarePng(source, iconPath, 512);
  await writeSquarePng(source, applePath, 180);

  try {
    unlinkSync(icoPath);
  } catch {
    // already gone
  }

  return { iconPath, applePath, source };
}

async function main() {
  const source = process.argv[2] ? resolve(process.argv[2]) : findDroppedSource();
  if (!source) {
    console.error(
      `No image in ${dropDir}. Drop a PNG, JPG, WebP, GIF, or SVG there, then rerun.`,
    );
    process.exit(1);
  }
  const result = await applyFavicon(source);
  console.log(
    JSON.stringify({
      ok: true,
      source: result.source,
      icon: result.iconPath,
      appleIcon: result.applePath,
    }),
  );
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
