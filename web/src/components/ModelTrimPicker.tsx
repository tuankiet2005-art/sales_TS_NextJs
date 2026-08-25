"use client";

import { useI18n } from "../i18n/LanguageContext";
import { motionInteractive } from "../lib/motion";
import type { VehicleDetail } from "../types";

export function ModelTrimPicker({
  trims,
  value,
  onChange,
  compact = false,
}: {
  trims: VehicleDetail[];
  value: string;
  onChange: (trimName: string) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (trims.length === 0) {
    return null;
  }

  if (trims.length === 1) {
    return (
      <span className="text-sm text-ink/60">
        {t("pickTrim")}: <span className="font-semibold text-ink">{trims[0]!.name}</span>
      </span>
    );
  }

  return (
    <div className={compact ? "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center" : ""}>
      {!compact ? <p className="text-sm font-medium">{t("pickTrim")}</p> : null}
      {compact ? (
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
          {t("pickTrim")}
        </span>
      ) : null}
      <div
        className={`flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          compact ? "min-w-0 flex-1" : "mt-2 flex-wrap"
        }`}
      >
        {trims.map((trim) => (
          <button
            key={trim.id}
            type="button"
            onClick={() => onChange(trim.name)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${motionInteractive} ${
              value === trim.name ? "bg-copper text-paper" : "bg-paper text-ink ring-1 ring-ink/10"
            }`}
          >
            {trim.name}
          </button>
        ))}
      </div>
    </div>
  );
}
