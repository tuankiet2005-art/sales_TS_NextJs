"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Lang } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") {
    return "vi";
  }
  const stored = localStorage.getItem("onroad-lang");
  if (stored === "en" || stored === "vi" || stored === "zh" || stored === "ja") {
    return stored;
  }
  return "vi";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  useEffect(() => {
    setLangState(readStoredLang());
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    function t(key: string, vars?: Record<string, string | number>) {
      let text = translations[lang][key] ?? translations.vi[key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    }
    return {
      lang,
      setLang(next) {
        if (typeof window !== "undefined") {
          localStorage.setItem("onroad-lang", next);
        }
        setLangState(next);
      },
      t,
    };
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider");
  }
  return context;
}
