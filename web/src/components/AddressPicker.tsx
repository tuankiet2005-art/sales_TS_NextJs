"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n/LanguageContext";
import { districtLabel, locationLabel } from "../lib/labels";
import type { Location, LocationDistrict } from "../types";

const selectClass =
  "h-12 w-full min-w-0 appearance-none rounded-full border border-ink/10 bg-white px-4 text-sm text-ink outline-none ring-copper/30 focus:ring-2 disabled:bg-paper disabled:text-ink/45";

export function AddressPicker({
  locations,
  locationId,
  districtId,
  onLocationChange,
  onDistrictChange,
  className,
}: {
  locations: Location[];
  locationId?: number;
  districtId?: number;
  onLocationChange: (id: number) => void;
  onDistrictChange: (id: number) => void;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const [districts, setDistricts] = useState<LocationDistrict[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    if (!locationId) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    api
      .getLocationDistricts(locationId)
      .then((rows) => {
        if (!cancelled) {
          setDistricts(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDistricts([]);
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

  return (
    <div className={`grid gap-2 sm:grid-cols-2 ${className ?? ""}`}>
      <div className="relative min-w-0">
        <select
          value={locationId ?? ""}
          onChange={(event) => onLocationChange(Number(event.target.value))}
          className={selectClass}
          aria-label={t("provinceCity")}
        >
          {locations.map((item) => (
            <option key={item.id} value={item.id}>
              {locationLabel(item, lang)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" />
      </div>
      <div className="relative min-w-0">
        <select
          value={districtId ?? ""}
          onChange={(event) => onDistrictChange(Number(event.target.value))}
          disabled={!locationId || loadingDistricts || districts.length === 0}
          className={`${selectClass} ${!districtId ? "bg-paper" : ""} pr-9`}
          aria-label={t("districtCounty")}
        >
          <option value="">{t("districtCountyPlaceholder")}</option>
          {districts.map((item) => (
            <option key={item.id} value={item.id}>
              {districtLabel(item, lang)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" />
      </div>
    </div>
  );
}
