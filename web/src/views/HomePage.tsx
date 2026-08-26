"use client";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "../api/client";
import { Header } from "../components/Header";
import { ListFilterSelect } from "../components/ListFilterSelect";
import { VehicleCardSkeleton } from "../components/LoadingState";
import { Pagination, catalogPageSize } from "../components/Pagination";
import { ModelCard } from "../components/ModelCard";
import { useI18n } from "../i18n/LanguageContext";
import { loadCategoryCache, saveCategoryCache } from "../lib/catalogReferenceCache";
import { motionInteractive, motionStagger } from "../lib/motion";
import type { Brand, Category, VehicleModelSummary } from "../types";

const PAGE_SIZE = catalogPageSize();

function vehicleTypeLabel(t: (key: string) => string, vehicleType: string) {
  const key = `admin.opt.${vehicleType}`;
  return t(key) === key ? vehicleType : t(key);
}

export function HomePage() {
  const params = useParams() ?? {};
  const brandCode = typeof params.brandCode === "string" ? params.brandCode : "";
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams?.get("q") ?? "");
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
  const categoryId = searchParams?.get("category") ? Number(searchParams.get("category")) : undefined;
  const modelFilter = searchParams?.get("model") ?? "";
  const vehicleTypeFilter = searchParams?.get("type") ?? "";
  const page = Math.max(1, Number(searchParams?.get("page") ?? 1) || 1);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [categories, setCategories] = useState<Category[]>(() => loadCategoryCache() ?? []);
  const [models, setModels] = useState<VehicleModelSummary[]>([]);
  const [modelTotal, setModelTotal] = useState(0);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<string[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;
    api
      .getCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          saveCategoryCache(data);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!brandCode) {
      return;
    }
    let cancelled = false;
    api
      .getBrand(brandCode)
      .then((nextBrand) => {
        if (!cancelled) {
          setBrand(nextBrand);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [brandCode]);

  useEffect(() => {
    if (!brandCode) {
      return;
    }
    const controller = new AbortController();
    setVehiclesLoading(true);
    setError(null);
    api
      .searchModelsPage(
        {
          keyword: debouncedKeyword,
          brandCode,
          categoryId,
          model: modelFilter || undefined,
          vehicleType: vehicleTypeFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        { signal: controller.signal },
      )
      .then((result) => {
        setModels(result.items);
        setModelTotal(result.total);
        setModelOptions(result.filterOptions.models);
        setVehicleTypeOptions(result.filterOptions.vehicleTypes);
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setVehiclesLoading(false);
        }
      });
    return () => {
      controller.abort();
    };
  }, [brandCode, categoryId, debouncedKeyword, modelFilter, page, vehicleTypeFilter]);

  const modelSelectOptions = useMemo(
    () => modelOptions.map((model) => ({ value: model, label: model })),
    [modelOptions],
  );

  const vehicleTypeSelectOptions = useMemo(
    () =>
      vehicleTypeOptions.map((vehicleType) => ({
        value: vehicleType,
        label: vehicleTypeLabel(t, vehicleType),
      })),
    [vehicleTypeOptions, t],
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId),
    [categories, categoryId],
  );

  function pushQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function selectCategory(id?: number) {
    pushQuery({
      category: id ? String(id) : undefined,
      model: undefined,
      type: undefined,
      page: undefined,
    });
  }

  function selectModel(model: string) {
    pushQuery({
      model: model || undefined,
      page: undefined,
    });
  }

  function selectVehicleType(type: string) {
    pushQuery({
      type: type || undefined,
      page: undefined,
    });
  }

  function selectPage(nextPage: number) {
    pushQuery({ page: nextPage <= 1 ? undefined : String(nextPage) });
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
        <Header />
        <main className="mx-auto flex w-full max-w-page flex-1 flex-col min-h-0 px-4 pb-4 sm:px-6 lg:pb-3">
          <section className="shrink-0 pt-4 motion-enter sm:pt-5 lg:pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3 gap-y-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-copper sm:text-xs">
                {brand?.name ?? t("heroKicker")} · {t("marketVietnam")}
              </p>
              <h1 className="mt-1 font-display text-xl leading-tight text-ink sm:text-2xl lg:text-[1.65rem]">
                {t("heroTitle")}
              </h1>
            </div>
            <p className="text-xs text-ink/55 sm:text-sm">
              {vehiclesLoading ? t("loadingCatalog") : t("modelsCount", { n: modelTotal })}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:mt-3 lg:flex-row lg:items-end">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 w-full rounded-xl border border-ink/10 bg-white pl-10 pr-4 text-sm outline-none ring-copper/30 transition-shadow duration-300 ease-motion focus:ring-2 sm:h-11"
              />
            </label>
            <div className="flex flex-wrap gap-2 lg:shrink-0">
              <ListFilterSelect
                label={t("filterModel")}
                value={modelFilter}
                onChange={selectModel}
                options={modelSelectOptions}
                allLabel={t("filterAll")}
              />
              <ListFilterSelect
                label={t("filterBodyStyle")}
                value={vehicleTypeFilter}
                onChange={selectVehicleType}
                options={vehicleTypeSelectOptions}
                allLabel={t("filterAll")}
              />
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => selectCategory(undefined)}
              className={`rounded-full px-3 py-1.5 text-xs sm:text-sm ${motionInteractive} ${
                !categoryId ? "bg-ink text-paper" : "bg-white text-ink/70 ring-1 ring-ink/10"
              }`}
            >
              {t("allTypes")}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => selectCategory(category.id)}
                className={`rounded-full px-3 py-1.5 text-xs sm:text-sm ${motionInteractive} ${
                  categoryId === category.id
                    ? "bg-ink text-paper"
                    : "bg-white text-ink/70 ring-1 ring-ink/10"
                }`}
              >
                {t(`category.${category.code}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-3 flex min-h-0 flex-1 flex-col sm:mt-4 lg:mt-3">
          {selectedCategory ? (
            <h2 className="mb-2 shrink-0 font-display text-lg text-ink sm:text-xl">
              {t(`category.${selectedCategory.code}`)}
            </h2>
          ) : (
            <h2 className="mb-2 shrink-0 font-display text-lg text-ink sm:text-xl lg:hidden">
              {t("availableVehicles")}
            </h2>
          )}

          {error && (
            <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p>{t("apiError")}</p>
              <p className="mt-1 text-xs text-red-700/80">{error}</p>
            </div>
          )}

          {!vehiclesLoading && !error && models.length === 0 && (
            <p className="rounded-2xl bg-white px-5 py-10 text-center text-ink/60">
              {brand && !brand.ready ? t("emptyBrand") : t("emptySearch")}
            </p>
          )}

          <div
            className="grid min-h-0 flex-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:auto-rows-fr lg:gap-3"
            aria-busy={vehiclesLoading}
          >
            {vehiclesLoading ? (
              <VehicleCardSkeleton count={6} compact />
            ) : (
              models.map((model, index) => (
                <ModelCard
                  key={`${model.brandCode}-${model.model}`}
                  model={model}
                  brandCode={brandCode}
                  index={index}
                  compact
                />
              ))
            )}
          </div>

          {!vehiclesLoading ? (
            <div className="shrink-0">
              <Pagination page={page} total={modelTotal} onPageChange={selectPage} />
            </div>
          ) : null}
        </section>
        </main>
      </div>

      <section id="how-it-works" className="border-t border-ink/10 bg-white/70">
        <div className="mx-auto grid max-w-page gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 sm:py-8 lg:grid-cols-4">
          {[
            ["01", "step1Title"],
            ["02", "step2Title"],
            ["03", "step3Title"],
            ["04", "step4Title"],
          ].map(([step, title], index) => (
            <div key={step} className="motion-enter" style={motionStagger(index, 80)}>
              <p className="text-xs font-semibold tracking-[0.2em] text-copper">{step}</p>
              <h3 className="mt-1 font-display text-lg sm:text-xl">{t(title)}</h3>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
