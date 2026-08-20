"use client";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "../api/client";
import { Header } from "../components/Header";
import { ListFilterSelect } from "../components/ListFilterSelect";
import { VehicleCard } from "../components/VehicleCard";
import { useI18n } from "../i18n/LanguageContext";
import { softIncludes } from "../lib/softSearch";
import type { Brand, Category, VehicleSummary } from "../types";

export function HomePage() {
  const params = useParams() ?? {};
  const brandCode = typeof params.brandCode === "string" ? params.brandCode : "";
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams?.get("q") ?? "");
  const [categoryId, setCategoryId] = useState<number | undefined>(
    searchParams?.get("category") ? Number(searchParams.get("category")) : undefined
  );
  const [modelFilter, setModelFilter] = useState(searchParams?.get("model") ?? "");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState(searchParams?.get("type") ?? "");
  const [brand, setBrand] = useState<Brand | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => undefined);
    api.getBrand(brandCode).then(setBrand).catch(() => setBrand(null));
  }, [brandCode]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .searchVehicles("", brandCode)
      .then((data) => {
        if (!cancelled) {
          setVehicles(data);
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
  }, [brandCode]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId),
    [categories, categoryId]
  );

  const modelOptions = useMemo(
    () =>
      [...new Set(vehicles.map((vehicle) => vehicle.model).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((model) => ({ value: model, label: model })),
    [vehicles]
  );

  const vehicleTypeOptions = useMemo(
    () =>
      [...new Set(vehicles.map((vehicle) => vehicle.vehicleType).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((vehicleType) => ({ value: vehicleType, label: vehicleType })),
    [vehicles]
  );

  const visibleVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        const inCategory = !categoryId || vehicle.category.id === categoryId;
        const inModel = !modelFilter || vehicle.model === modelFilter;
        const inVehicleType = !vehicleTypeFilter || vehicle.vehicleType === vehicleTypeFilter;
        return (
          inCategory &&
          inModel &&
          inVehicleType &&
          softIncludes(keyword, vehicle.name, vehicle.model, vehicle.brand, vehicle.vehicleType, vehicle.year)
        );
      }),
    [vehicles, categoryId, keyword, modelFilter, vehicleTypeFilter]
  );

  function syncFilters(next: { categoryId?: number; model?: string; type?: string }) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.categoryId) {
      params.set("category", String(next.categoryId));
    } else if ("categoryId" in next) {
      params.delete("category");
    }
    if (next.model) {
      params.set("model", next.model);
    } else if ("model" in next) {
      params.delete("model");
    }
    if (next.type) {
      params.set("type", next.type);
    } else if ("type" in next) {
      params.delete("type");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function selectCategory(id?: number) {
    setCategoryId(id);
    syncFilters({ categoryId: id });
  }

  function selectModel(model: string) {
    setModelFilter(model);
    syncFilters({ model });
  }

  function selectVehicleType(type: string) {
    setVehicleTypeFilter(type);
    syncFilters({ type });
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="mx-auto max-w-page px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
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
              className="h-14 w-full rounded-2xl border border-ink/10 bg-white pl-14 pr-5 text-base outline-none ring-copper/30 focus:ring-4"
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectCategory(undefined)}
              className={`rounded-full px-4 py-2 text-sm ${
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
                className={`rounded-full px-4 py-2 text-sm ${
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
              options={modelOptions}
              allLabel={t("filterAll")}
            />
            <ListFilterSelect
              label={t("filterBodyStyle")}
              value={vehicleTypeFilter}
              onChange={selectVehicleType}
              options={vehicleTypeOptions}
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
              {loading ? t("loadingCatalog") : t("modelsCount", { n: visibleVehicles.length })}
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p>{t("apiError")}</p>
              <p className="mt-1 text-xs text-red-700/80">{error}</p>
            </div>
          )}

          {!loading && !error && visibleVehicles.length === 0 && (
            <p className="rounded-2xl bg-white px-5 py-10 text-center text-ink/60">
              {brand && !brand.ready ? t("emptyBrand") : t("emptySearch")}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} brandCode={brandCode} />
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-t border-ink/10 bg-white/70">
          <div className="mx-auto grid max-w-page gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-14 lg:grid-cols-4">
            {[
              ["01", "step1Title"],
              ["02", "step2Title"],
              ["03", "step3Title"],
              ["04", "step4Title"],
            ].map(([step, title]) => (
              <div key={step}>
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
