import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const text = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "translations.ts"), "utf8");
const langs = ["en", "vi", "zh", "ja"];

function extractLangBlock(lang: string) {
  const start = text.indexOf(`${lang}: {`);
  if (start < 0) return "";
  let depth = 0;
  for (let i = start + lang.length + 2; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return "";
}

function extractKeys(block: string) {
  const keys = new Set<string>();
  const inner = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}"));
  for (const line of inner.split("\n")) {
    const m = line.match(/^\s*(?:["']([^"']+)["']|([a-zA-Z][a-zA-Z0-9_]*))\s*:/);
    if (m) keys.add(m[1] || m[2]!);
  }
  return keys;
}

describe("translations.ts", () => {
  it("keeps the same UI keys in every language", () => {
    const keySets = Object.fromEntries(langs.map((lang) => [lang, extractKeys(extractLangBlock(lang))]));
    const all = new Set(langs.flatMap((lang) => [...keySets[lang as keyof typeof keySets]]));
    for (const lang of langs) {
      const missing = [...all].filter((key) => !keySets[lang as keyof typeof keySets].has(key));
      expect(missing, `${lang} is missing keys`).toEqual([]);
    }
  });
});
