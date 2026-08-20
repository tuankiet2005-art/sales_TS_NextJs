"use client";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../api/client";
import { Header } from "../components/Header";
import { ListFilterSelect } from "../components/ListFilterSelect";
import { Pagination, catalogPageSize } from "../components/Pagination";
import { useI18n } from "../i18n/LanguageContext";
import { formatVnd } from "../lib/format";
import { motionInteractive, motionStagger } from "../lib/motion";
import { saveExtras } from "../lib/quoteExtras";
import { savePolicyChoices } from "../lib/quotePolicy";
import type { QuoteExtras, QuoteHistory } from "../types";

const PAGE_SIZE = catalogPageSize();

export function QuoteHistoryPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [brandFilter, setBrandFilter] = useState(searchParams?.get("brand") ?? "");
  const [locationFilter, setLocationFilter] = useState(searchParams?.get("location") ?? "");
  const page = Math.max(1, Number(searchParams?.get("page") ?? 1) || 1);
  const [rows, setRows] = useState<QuoteHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    api
      .getQuoteFilterOptions()
      .then((filters) => {
        if (!cancelled) {
          setBrandOptions(filters.brandCodes.map((brandCode) => ({ value: brandCode, label: brandCode })));
          setLocationOptions(
            filters.locationNames.map((locationName) => ({ value: locationName, label: locationName })),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listQuotes({
        query: debouncedQuery,
        brandCode: brandFilter || undefined,
        locationName: locationFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((result) => {
        if (!cancelled) {
          setRows(result.items);
          setTotal(result.total);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, brandFilter, locationFilter, page]);

  function pushQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const queryString = params.toString();
    router.push(queryString ? `/quotes?${queryString}` : "/quotes");
  }

  function updateBrandFilter(value: string) {
    setBrandFilter(value);
    pushQuery({ brand: value || undefined, page: undefined });
  }

  function updateLocationFilter(value: string) {
    setLocationFilter(value);
    pushQuery({ location: value || undefined, page: undefined });
  }

  function selectPage(nextPage: number) {
    pushQuery({ page: nextPage <= 1 ? undefined : String(nextPage) });
  }

  async function openQuote(row: QuoteHistory) {
    if (!row.vehicleId || !row.brandCode || !row.locationId) {
      return;
    }
    const full = row.payload ? row : await api.getQuote(row.id);
    if (!full) {
      return;
    }
    const extras = extrasFromPayload(full.payload);
    const offers = offersFromPayload(full.payload);
    saveExtras(full.vehicleId, extras);
    savePolicyChoices(full.vehicleId, {
      usageType: full.usageType === "COMMERCIAL" ? "COMMERCIAL" : "PRIVATE",
      selectedOfferIds: offers.selectedOfferIds,
      forgoneOfferIds: offers.forgoneOfferIds,
    });
    const params = new URLSearchParams();
    params.set("locationId", String(full.locationId));
    if (full.categoryId) {
      params.set("categoryId", String(full.categoryId));
    }
    if (full.includeOptional) {
      params.set("optional", "1");
    }
    if (full.customerName) {
      params.set("name", full.customerName);
    }
    if (full.customerAddress) {
      params.set("address", full.customerAddress);
    }
    if (full.color) {
      params.set("color", full.color);
    }
    params.set("usage", full.usageType === "COMMERCIAL" ? "commercial" : "private");
    router.push(`/brand/${full.brandCode}/vehicles/${full.vehicleId}/on-road?${params.toString()}`);
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-page px-4 py-6 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-copper">{t("quoteHistory.nav")}</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">{t("quoteHistory.title")}</h1>

        <label className="relative mt-5 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("quoteHistory.search")}
            className="h-11 w-full rounded-xl border border-ink/10 bg-white pl-10 pr-3 text-sm shadow-card"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-3">
          <ListFilterSelect
            label={t("filterBrand")}
            value={brandFilter}
            onChange={updateBrandFilter}
            options={brandOptions}
            allLabel={t("filterAll")}
          />
          <ListFilterSelect
            label={t("filterLocation")}
            value={locationFilter}
            onChange={updateLocationFilter}
            options={locationOptions}
            allLabel={t("filterAll")}
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-4 rounded-2xl bg-white px-4 py-8 text-sm text-ink/55 shadow-card">{t("loadingCatalog")}</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white px-4 py-8 text-sm text-ink/55 shadow-card">{t("quoteHistory.empty")}</p>
        ) : (
          <>
            <ul className="mt-4 space-y-3 md:hidden">
              {rows.map((row, index) => (
                <li
                  key={row.id}
                  className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card motion-enter"
                  style={motionStagger(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.customerName}</p>
                      <p className="mt-0.5 truncate text-sm text-ink/60">{row.vehicleName}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-copper">{formatVnd(row.onRoadTotal)}</p>
                  </div>
                  <p className="mt-2 text-xs text-ink/50">
                    {formatQuoteDate(row.createdAt, lang)}
                    {row.locationName ? ` · ${row.locationName}` : ""}
                  </p>
                  {row.customerAddress && <p className="mt-1 text-xs text-ink/50">{row.customerAddress}</p>}
                  <button
                    type="button"
                    onClick={() => openQuote(row)}
                    className={`mt-3 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-copper ${motionInteractive}`}
                  >
                    {t("quoteHistory.open")}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-ink/8 bg-white shadow-card md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-paper text-[11px] uppercase tracking-wide text-ink/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("quoteHistory.date")}</th>
                    <th className="px-3 py-2 font-medium">{t("quoteHistory.customer")}</th>
                    <th className="px-3 py-2 font-medium">{t("quoteHistory.vehicle")}</th>
                    <th className="px-3 py-2 font-medium">{t("quoteHistory.location")}</th>
                    <th className="px-3 py-2 font-medium">{t("quoteHistory.total")}</th>
                    <th className="px-3 py-2 font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-t border-ink/6 motion-enter"
                      style={motionStagger(index, 35, 280)}
                    >
                      <td className="px-3 py-2">{formatQuoteDate(row.createdAt, lang)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{row.customerName}</p>
                        {row.customerAddress && <p className="text-xs text-ink/50">{row.customerAddress}</p>}
                      </td>
                      <td className="px-3 py-2">{row.vehicleName}</td>
                      <td className="px-3 py-2">{row.locationName}</td>
                      <td className="px-3 py-2">{formatVnd(row.onRoadTotal)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openQuote(row)}
                          className="cursor-pointer text-sm font-semibold text-copper"
                        >
                          {t("quoteHistory.open")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} onPageChange={selectPage} />
          </>
        )}
      </main>
    </div>
  );
}

interface StoredQuotePayload {
  discountAmount?: number;
  deposit?: number;
  optionalBodyInsurance?: number;
  registrationServiceFee?: number;
  micaPlateFee?: number;
  inspectionFee?: number;
  accessories?: QuoteExtras["accessories"];
  selectedOfferIds?: string[];
  forgoneOfferIds?: string[];
  request?: StoredQuotePayload;
}

function extrasFromPayload(payload?: string): QuoteExtras {
  const parsed = readPayload(payload);
  const source = parsed.request ?? parsed;
  return {
    discountAmount: numberOrUndefined(source.discountAmount),
    deposit: numberOrUndefined(source.deposit),
    optionalBodyInsurance: numberOrUndefined(source.optionalBodyInsurance),
    registrationServiceFee: numberOrUndefined(source.registrationServiceFee),
    micaPlateFee: numberOrUndefined(source.micaPlateFee),
    inspectionFee: numberOrUndefined(source.inspectionFee),
    accessories: Array.isArray(source.accessories) ? source.accessories : [],
  };
}

function offersFromPayload(payload?: string) {
  const parsed = readPayload(payload);
  const source = parsed.request ?? parsed;
  return {
    selectedOfferIds: Array.isArray(source.selectedOfferIds) ? source.selectedOfferIds.map(String) : [],
    forgoneOfferIds: Array.isArray(source.forgoneOfferIds) ? source.forgoneOfferIds.map(String) : [],
  };
}

function readPayload(payload?: string): StoredQuotePayload {
  if (!payload) {
    return {};
  }
  try {
    return JSON.parse(payload) as StoredQuotePayload;
  } catch {
    return {};
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function formatQuoteDate(value: string, lang: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : lang, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
