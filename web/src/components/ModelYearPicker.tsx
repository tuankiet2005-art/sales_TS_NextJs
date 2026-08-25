"use client";

import { useI18n } from "../i18n/LanguageContext";
import { motionInteractive } from "../lib/motion";
import type { VehicleDetail } from "../types";

export function ModelYearPicker({
  years,
  value,
  onChange,
  compact = false,
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (years.length <= 1) {
    return years.length === 1 ? (
      <span className="text-sm text-ink/60">
        {t("specYear")}: <span className="font-semibold text-ink">{years[0]}</span>
      </span>
    ) : null;
  }

  return (
    <div className={compact ? "flex min-w-0 flex-wrap items-center gap-2" : ""}>
      {!compact ? <p className="text-sm font-medium">{t("pickModelYear")}</p> : null}
      {compact ? (
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
          {t("pickModelYear")}
        </span>
      ) : null}
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-2"}`}>
        {years.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onChange(year)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${motionInteractive} ${
              value === year ? "bg-ink text-paper" : "bg-paper text-ink/70 ring-1 ring-ink/10"
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
