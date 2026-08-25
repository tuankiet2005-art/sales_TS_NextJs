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
}: {
  model: VehicleModelSummary;
  brandCode: string;
  index?: number;
}) {
  const { t } = useI18n();
  const yearLabel = yearRangeLabel(t, model.yearMin, model.yearMax);

  return (
    <Link
      href={`/brand/${brandCode}/models/${modelToSlug(model.model)}`}
      className={`group overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-card ${motionCard} motion-enter`}
      style={motionStagger(index)}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-mist">
        <img
          src={model.imageUrl}
          alt={model.model}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 ease-motion group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-3 py-1 text-xs font-semibold text-forest">
          {t(`category.${model.category.code}`)}
        </span>
        {yearLabel ? (
          <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-paper">
            {yearLabel}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-ink/45">{model.brand}</p>
        <h3 className="font-display text-lg leading-tight text-ink sm:text-xl">{model.model}</h3>
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-xs text-ink/50">{t("fromPrice")}</p>
            <p className="text-lg font-semibold text-copper">
              {formatVnd(model.minSalePrice ?? model.minListPrice)}
            </p>
          </div>
          <p className="text-sm text-ink/50">{t("trimCount", { n: model.trimCount })}</p>
        </div>
      </div>
    </Link>
  );
}
