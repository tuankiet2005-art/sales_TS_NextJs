const GLOSSARY: Record<string, { en: string; zh: string; ja: string }> = {
  "mitsubishi": { en: "Mitsubishi", zh: "三菱", ja: "三菱" },
  "xe con": { en: "passenger car", zh: "乘用车", ja: "乗用車" },
};

export async function translateFromVietnamese(text: string) {
  const source = text?.trim() ?? "";
  if (!source) {
    return { vi: "", en: "", zh: "", ja: "" };
  }
  const key = source.toLowerCase();
  const known = GLOSSARY[key];
  if (known) {
    return { vi: source, ...known };
  }
  const [en, zh, ja] = await Promise.all([
    remoteTranslate(source, "en"),
    remoteTranslate(source, "zh-CN"),
    remoteTranslate(source, "ja"),
  ]);
  return { vi: source, en, zh, ja };
}

async function remoteTranslate(text: string, target: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|${target}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      return text;
    }
    const body = (await response.json()) as { responseData?: { translatedText?: string } };
    return body.responseData?.translatedText?.trim() || text;
  } catch {
    return text;
  }
}
