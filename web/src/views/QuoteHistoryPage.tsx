"use client";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../api/client";
import { Header } from "../components/Header";
import { ListFilterSelect } from "../components/ListFilterSelect";
import { LoadingBlock, TableRowsSkeleton } from "../components/LoadingState";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { useI18n } from "../i18n/LanguageContext";
import type { Lang } from "../i18n/translations";
import { formatVnd } from "../lib/format";
import { motionInteractive, motionStagger } from "../lib/motion";
import { useDoubleTap } from "../lib/useDoubleTap";
import { saveExtras } from "../lib/quoteExtras";
import { savePolicyChoices } from "../lib/quotePolicy";
import type { QuoteExtras, QuoteHistory } from "../types";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export function QuoteHistoryPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [brandFilter, setBrandFilter] = useState(searchParams?.get("brand") ?? "");
  const [locationFilter, setLocationFilter] = useState(searchParams?.get("location") ?? "");
  const customerId = Number(searchParams?.get("customerId") ?? 0) || undefined;
  const openQuoteId = Number(searchParams?.get("open") ?? 0) || undefined;
  const page = Math.max(1, Number(searchParams?.get("page") ?? 1) || 1);
  const [rows, setRows] = useState<QuoteHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [customerFilterName, setCustomerFilterName] = useState<string | null>(null);
  const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingQuoteId, setOpeningQuoteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoOpenedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!customerId) {
      setCustomerFilterName(null);
      return;
    }
    let cancelled = false;
    api
      .getCustomer(customerId)
      .then((customer) => {
        if (!cancelled) {
          setCustomerFilterName(customer.fullName);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCustomerFilterName(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

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
        customerId,
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
  }, [debouncedQuery, brandFilter, locationFilter, customerId, page]);

  useEffect(() => {
    if (!openQuoteId || loading || rows.length === 0 || autoOpenedRef.current === openQuoteId) {
      return;
    }
    const target = rows.find((row) => row.id === openQuoteId);
    if (!target) {
      return;
    }
    autoOpenedRef.current = openQuoteId;
    void openQuote(target);
  }, [openQuoteId, loading, rows]);

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

  function clearCustomerFilter() {
    pushQuery({ customerId: undefined, open: undefined, page: undefined });
  }

  async function openQuote(row: QuoteHistory) {
    if (!row.vehicleId || !row.brandCode || !row.locationId || openingQuoteId !== null) {
      return;
    }
    setOpeningQuoteId(row.id);
    try {
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
      if (full.customerId) {
        params.set("customerId", String(full.customerId));
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
    } finally {
      setOpeningQuoteId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-page px-4 py-6 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-copper">{t("quoteHistory.nav")}</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">{t("quoteHistory.title")}</h1>

        {customerId && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-copper/20 bg-copper/5 px-4 py-3 text-sm">
            <p className="text-ink">
              {t("quoteHistory.customerFilter", {
                name: customerFilterName ?? `#${customerId}`,
              })}
            </p>
            <button
              type="button"
              onClick={clearCustomerFilter}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-copper hover:text-copper"
            >
              <X className="h-3.5 w-3.5" />
              {t("quoteHistory.clearCustomerFilter")}
            </button>
          </div>
        )}

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
          <>
            <ul className="mt-4 space-y-3 md:hidden" aria-busy="true">
              {Array.from({ length: 3 }, (_, index) => (
                <li
                  key={index}
                  className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card motion-fade-in"
                  aria-hidden
                >
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 w-2/3 rounded bg-mist" />
                    <div className="h-3 w-1/2 rounded bg-mist" />
                    <div className="h-3 w-1/3 rounded bg-mist" />
                  </div>
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
                <TableRowsSkeleton rows={PAGE_SIZE} columns={6} />
              </table>
            </div>
            <div className="mt-4">
              <LoadingBlock message={t("loadingCatalog")} size="sm" />
            </div>
          </>
        ) : rows.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white px-4 py-8 text-sm text-ink/55 shadow-card">{t("quoteHistory.empty")}</p>
        ) : (
          <>
            <ul className="mt-4 space-y-3 md:hidden">
              {rows.map((row, index) => (
                <QuoteHistoryMobileCard
                  key={row.id}
                  row={row}
                  index={index}
                  lang={lang}
                  t={t}
                  opening={openingQuoteId === row.id}
                  onOpen={() => openQuote(row)}
                />
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
                      className="list-data-row motion-interactive border-t border-ink/6 motion-enter"
                      style={motionStagger(index, 35, 280)}
                      onDoubleClick={() => openQuote(row)}
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
                          onDoubleClick={(event) => event.stopPropagation()}
                          disabled={openingQuoteId !== null}
                          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 text-xs font-semibold text-ink hover:border-copper hover:text-copper disabled:opacity-60"
                        >
                          {openingQuoteId === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : null}
                          {openingQuoteId === row.id ? t("quoteHistory.opening") : t("quoteHistory.open")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={selectPage} />
          </>
        )}
      </main>
    </div>
  );
}

function QuoteHistoryMobileCard({
  row,
  index,
  lang,
  t,
  opening,
  onOpen,
}: {
  row: QuoteHistory;
  index: number;
  lang: Lang;
  t: (key: string) => string;
  opening: boolean;
  onOpen: () => void;
}) {
  const { onTouchEnd } = useDoubleTap(onOpen);

  return (
    <li
      className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card motion-enter"
      style={motionStagger(index)}
      onTouchEnd={onTouchEnd}
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
        onClick={onOpen}
        disabled={opening}
        className={`mt-3 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-3 text-sm font-semibold text-ink hover:border-copper hover:text-copper disabled:opacity-60 ${motionInteractive}`}
      >
        {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {opening ? t("quoteHistory.opening") : t("quoteHistory.open")}
      </button>
    </li>
  );
}

interface StoredQuotePayload {
  discountAmount?: number;
  deposit?: number;
  bankLoan?: import("../types").QuoteBankLoan;
  listPrice?: number;
  optionalBodyInsurance?: number;
  registrationTax?: number;
  licensePlateFee?: number;
  registrationServiceFee?: number;
  micaPlateFee?: number;
  inspectionFee?: number;
  roadUseFee?: number;
  compulsoryInsurance?: number;
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
    bankLoan: source.bankLoan,
    listPrice: numberOrUndefined(source.listPrice),
    optionalBodyInsurance: numberOrUndefined(source.optionalBodyInsurance),
    registrationTax: numberOrUndefined(source.registrationTax),
    licensePlateFee: numberOrUndefined(source.licensePlateFee),
    registrationServiceFee: numberOrUndefined(source.registrationServiceFee),
    micaPlateFee: numberOrUndefined(source.micaPlateFee),
    inspectionFee: numberOrUndefined(source.inspectionFee),
    roadUseFee: numberOrUndefined(source.roadUseFee),
    compulsoryInsurance: numberOrUndefined(source.compulsoryInsurance),
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
