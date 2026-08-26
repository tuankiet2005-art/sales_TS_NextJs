"use client";
import Link from "next/link";
import { useI18n } from "../i18n/LanguageContext";
import { formatVnd } from "../lib/format";
import { modelToSlug } from "../lib/modelSlug";
import { motionCard, motionStagger } from "../lib/motion";
import type { VehicleModelSummary } from "../types";

function yearRangeLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  yearMin: number | null,
  yearMax: number | null,
) {
  if (yearMin && yearMax && yearMin !== yearMax) {
    return t("modelYearRange", { min: yearMin, max: yearMax });
  }
  if (yearMax) {
    return String(yearMax);
  }
  if (yearMin) {
    return String(yearMin);
  }
  return "";
}

export function ModelCard({
  model,
  brandCode,
  index = 0,
  compact = false,
}: {
  model: VehicleModelSummary;
  brandCode: string;
  index?: number;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const yearLabel = yearRangeLabel(t, model.yearMin, model.yearMax);

  return (
    <Link
      href={`/brand/${brandCode}/models/${modelToSlug(model.model)}`}
      className={`group overflow-hidden border border-ink/8 bg-white shadow-card ${motionCard} motion-enter ${
        compact
          ? "flex h-full min-h-0 flex-col rounded-2xl"
          : "rounded-3xl"
      }`}
      style={motionStagger(index)}
    >
      <div
        className={`relative overflow-hidden bg-mist ${
          compact ? "min-h-0 flex-1" : "aspect-[16/10]"
        }`}
      >
        <img
          src={model.imageUrl}
          alt={model.model}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition duration-500 ease-motion group-hover:scale-105 ${
            compact ? "min-h-[5.5rem]" : ""
          }`}
        />
        <span
          className={`absolute left-2 top-2 rounded-full bg-paper/90 font-semibold text-forest ${
            compact ? "px-2 py-0.5 text-[10px]" : "left-3 top-3 px-3 py-1 text-xs"
          }`}
        >
          {t(`category.${model.category.code}`)}
        </span>
        {yearLabel ? (
          <span
            className={`absolute right-2 top-2 rounded-full bg-ink/80 font-semibold text-paper ${
              compact ? "px-2 py-0.5 text-[10px]" : "right-3 top-3 px-3 py-1 text-xs"
            }`}
          >
            {yearLabel}
          </span>
        ) : null}
      </div>
      <div className={compact ? "shrink-0 space-y-0.5 p-2.5 sm:p-3" : "space-y-2 p-4 sm:p-5"}>
        <p
          className={`uppercase tracking-[0.18em] text-ink/45 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          {model.brand}
        </p>
        <h3
          className={`font-display leading-tight text-ink ${
            compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"
          }`}
        >
          {model.model}
        </h3>
        <div className={`flex items-end justify-between ${compact ? "pt-1" : "pt-2"}`}>
          <div>
            <p className={compact ? "text-[10px] text-ink/50" : "text-xs text-ink/50"}>
              {t("fromPrice")}
            </p>
            <p
              className={`font-semibold text-copper ${
                compact ? "text-sm sm:text-base" : "text-lg"
              }`}
            >
              {formatVnd(model.minSalePrice ?? model.minListPrice)}
            </p>
          </div>
          <p className={compact ? "text-[11px] text-ink/50" : "text-sm text-ink/50"}>
            {t("trimCount", { n: model.trimCount })}
          </p>
        </div>
      </div>
    </Link>
  );
}
