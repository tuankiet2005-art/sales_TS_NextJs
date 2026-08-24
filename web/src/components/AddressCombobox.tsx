"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n/LanguageContext";
import { districtLabel, locationLabel } from "../lib/labels";
import type { Location, LocationDistrict } from "../types";

const selectClass =
  "h-12 w-full min-w-0 appearance-none rounded-full border border-ink/10 bg-white px-4 pr-10 text-sm text-ink outline-none ring-copper/30 focus:ring-2 disabled:bg-mist/50 disabled:text-ink/45";

export function AddressCombobox({
  locations,
  locationId,
  districtId,
  onLocationChange,
  onDistrictChange,
  compact = false,
}: {
  locations: Location[];
  locationId?: number;
  districtId?: number;
  onLocationChange: (id: number) => void;
  onDistrictChange: (id: number) => void;
  compact?: boolean;
}) {
  const { t, lang } = useI18n();
  const [districts, setDistricts] = useState<LocationDistrict[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [districtLoadError, setDistrictLoadError] = useState(false);

  useEffect(() => {
    if (!locationId) {
      setDistricts([]);
      setDistrictLoadError(false);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    setDistrictLoadError(false);
    api
      .getLocationDistricts(locationId)
      .then((rows) => {
        if (!cancelled) {
          setDistricts(rows);
          setDistrictLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDistricts([]);
          setDistrictLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDistricts(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const districtDisabled = !locationId || loadingDistricts;

  const heightClass = compact ? "h-11 sm:h-8" : "h-12";

  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${compact ? "" : "mt-1"}`}>
      <label className="relative block">
        <select
          value={locationId ?? ""}
          onChange={(event) => onLocationChange(Number(event.target.value))}
          className={`${selectClass} ${heightClass} ${compact ? "text-base sm:text-sm" : ""}`}
          aria-label={t("provinceCity")}
        >
          <option value="" disabled>{t("provinceCity")}</option>
          {locations.map((item) => (
            <option key={item.id} value={item.id}>
              {locationLabel(item, lang)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink/50" />
      </label>
      <label className="relative block">
        <select
          value={districtId ?? ""}
          onChange={(event) => onDistrictChange(Number(event.target.value))}
          disabled={districtDisabled}
          className={`${selectClass} ${heightClass} ${compact ? "text-base sm:text-sm" : ""}`}
          aria-label={t("districtCounty")}
          aria-busy={loadingDistricts}
        >
          <option value="">
            {loadingDistricts ? t("loadingDistricts") : t("districtCounty")}
          </option>
          {districts.map((item) => (
            <option key={item.id} value={item.id}>
              {districtLabel(item, lang)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink/50" />
      </label>
      {districtLoadError && (
        <p className="text-xs text-red-700 sm:col-span-2">{t("districtLoadError")}</p>
      )}
      {!districtLoadError && !loadingDistricts && locationId && districts.length === 0 && (
        <p className="text-xs text-ink/55 sm:col-span-2">{t("districtListEmpty")}</p>
      )}
    </div>
  );
}
