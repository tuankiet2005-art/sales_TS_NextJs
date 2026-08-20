"use client";
import { Languages } from "lucide-react";
import { languages } from "../i18n/translations";
import { useI18n } from "../i18n/LanguageContext";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <label className="flex items-center gap-1.5 text-sm sm:gap-2.5 sm:text-base">
      <Languages className="h-4 w-4 shrink-0 text-ink/55 sm:h-5 sm:w-5" />
      <select
        value={lang}
        onChange={(event) => setLang(event.target.value as typeof lang)}
        className="h-10 max-w-[9.5rem] rounded-full border border-ink/15 bg-white px-2.5 text-sm text-ink sm:max-w-none sm:px-4 sm:text-base"
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
