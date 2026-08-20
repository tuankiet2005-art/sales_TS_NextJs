"use client";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "../api/client";
import { Header } from "../components/Header";
import { ListFilterSelect } from "../components/ListFilterSelect";
import { Pagination, catalogPageSize } from "../components/Pagination";
import { VehicleCard } from "../components/VehicleCard";
import { useI18n } from "../i18n/LanguageContext";
import { loadCategoryCache, saveCategoryCache } from "../lib/catalogReferenceCache";
import { motionInteractive, motionStagger } from "../lib/motion";
import type { Brand, Category, VehicleSummary } from "../types";

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
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [vehicleTotal, setVehicleTotal] = useState(0);
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
      .searchVehiclesPage(
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
        setVehicles(result.items);
        setVehicleTotal(result.total);
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
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="mx-auto max-w-page px-4 pb-8 pt-8 sm:px-6 sm:pt-12 motion-enter">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-copper sm:text-sm">
            {brand?.name ?? t("heroKicker")} · {t("marketVietnam")}
          </p>
          <h1 className="mt-3 max-w-3xl text-balance font-display text-3xl leading-[1.1] text-ink sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            {t("heroTitle")}
          </h1>

          <label className="relative mt-8 block">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-14 w-full rounded-2xl border border-ink/10 bg-white pl-14 pr-5 text-base outline-none ring-copper/30 transition-shadow duration-300 ease-motion focus:ring-4"
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectCategory(undefined)}
              className={`rounded-full px-4 py-2 text-sm ${motionInteractive} ${
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
                className={`rounded-full px-4 py-2 text-sm ${motionInteractive} ${
                  categoryId === category.id
                    ? "bg-ink text-paper"
                    : "bg-white text-ink/70 ring-1 ring-ink/10"
                }`}
              >
                {t(`category.${category.code}`)}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
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
        </section>

        <section className="mx-auto max-w-page px-4 pb-16 sm:px-6">
          <div className="mb-6">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              {selectedCategory ? t(`category.${selectedCategory.code}`) : t("availableVehicles")}
            </h2>
            <p className="mt-1 text-sm text-ink/55">
              {vehiclesLoading ? t("loadingCatalog") : t("modelsCount", { n: vehicleTotal })}
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p>{t("apiError")}</p>
              <p className="mt-1 text-xs text-red-700/80">{error}</p>
            </div>
          )}

          {!vehiclesLoading && !error && vehicles.length === 0 && (
            <p className="rounded-2xl bg-white px-5 py-10 text-center text-ink/60">
              {brand && !brand.ready ? t("emptyBrand") : t("emptySearch")}
            </p>
          )}

          <div
            className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${vehiclesLoading ? "opacity-60" : ""}`}
            aria-busy={vehiclesLoading}
          >
            {vehicles.map((vehicle, index) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} brandCode={brandCode} index={index} />
            ))}
          </div>

          <Pagination page={page} total={vehicleTotal} onPageChange={selectPage} />
        </section>

        <section id="how-it-works" className="border-t border-ink/10 bg-white/70">
          <div className="mx-auto grid max-w-page gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-14 lg:grid-cols-4">
            {[
              ["01", "step1Title"],
              ["02", "step2Title"],
              ["03", "step3Title"],
              ["04", "step4Title"],
            ].map(([step, title], index) => (
              <div key={step} className="motion-enter" style={motionStagger(index, 80)}>
                <p className="text-xs font-semibold tracking-[0.2em] text-copper">{step}</p>
                <h3 className="mt-2 font-display text-2xl">{t(title)}</h3>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
