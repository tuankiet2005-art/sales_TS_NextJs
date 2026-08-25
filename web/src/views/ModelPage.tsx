"use client";
import { Briefcase, Gift, Percent, User } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "../api/client";
import { CustomerPicker } from "../components/CustomerPicker";
import { ColorPhotoImage } from "../components/ColorPhotoImage";
import { Header } from "../components/Header";
import { PageLoadingScreen } from "../components/LoadingState";
import { ModelConfigBar } from "../components/ModelConfigBar";
import { VehicleImageSlideshow } from "../components/VehicleImageSlideshow";
import { useI18n } from "../i18n/LanguageContext";
import type { Lang } from "../i18n/translations";
import { formatVnd } from "../lib/format";
import { codedOption } from "../lib/labels";
import {
  composeStructuredAddress,
  emptyCustomerFields,
  resolveDeliveryAddress,
  resolveQuoteFeeLocation,
  type CustomerFieldValues,
  type StructuredAddress,
} from "../lib/customerAddress";
import { priceVehicleFromPolicy } from "../lib/dealerPricing";
import { slugToModel } from "../lib/modelSlug";
import { motionInteractive, motionPress } from "../lib/motion";
import { extrasFromVehicle, loadExtras, saveExtras } from "../lib/quoteExtras";
import {
  loadCategoryCache,
  loadLocationCache,
  saveCategoryCache,
  saveLocationCache,
} from "../lib/catalogReferenceCache";
import { saveVehicleCache } from "../lib/vehicleCache";
import { colorPhoto } from "../lib/vehicleColor";
import { buildColorSlideUrls } from "../lib/vehicleGallery";
import { defaultPolicyChoices, loadPolicyChoices, localizedPolicyText, savePolicyChoices } from "../lib/quotePolicy";
import type { Category, DealerOffer, DealerPolicy, Location, QuoteExtras, UsageType, VehicleDetail, VehicleModelDetail } from "../types";

function appendAddressParams(
  params: URLSearchParams,
  prefix: "permanent" | "temporary",
  address: StructuredAddress,
) {
  if (address.streetLine.trim()) {
    params.set(`${prefix}Street`, address.streetLine.trim());
  }
  if (address.locationId) {
    params.set(`${prefix}LocationId`, String(address.locationId));
  }
  if (address.districtId) {
    params.set(`${prefix}DistrictId`, String(address.districtId));
  }
}

function findVehicleInDetail(detail: VehicleModelDetail, vehicleId: number): VehicleDetail | null {
  for (const year of detail.years) {
    const match = detail.trimsByYear[String(year)]?.find((item) => item.id === vehicleId);
    if (match) {
      return match;
    }
  }
  return null;
}

function defaultSelection(detail: VehicleModelDetail, preferredVehicleId?: number) {
  if (preferredVehicleId) {
    const match = findVehicleInDetail(detail, preferredVehicleId);
    if (match) {
      return { year: match.year, vehicle: match };
    }
  }
  const year = detail.defaultYear;
  const vehicle = detail.trimsByYear[String(year)]?.[0] ?? null;
  return { year, vehicle };
}

export function ModelPage() {
  const params = useParams() ?? {};
  const searchParams = useSearchParams();
  const brandCode = typeof params.brandCode === "string" ? params.brandCode : "";
  const modelSlug = typeof params.modelSlug === "string" ? params.modelSlug : "";
  const modelName = slugToModel(modelSlug);
  const preferredVehicleId = Number(searchParams?.get("vehicleId") ?? 0) || undefined;
  const router = useRouter();
  const { t, lang } = useI18n();

  const [modelDetail, setModelDetail] = useState<VehicleModelDetail | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>(() => loadCategoryCache() ?? []);
  const [locations, setLocations] = useState<Location[]>(() => loadLocationCache() ?? []);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [customerFields, setCustomerFields] = useState<CustomerFieldValues>(emptyCustomerFields());
  const [feeFallback, setFeeFallback] = useState<{ locationId?: number; districtId?: number }>({});
  const [includeOptional, setIncludeOptional] = useState(false);
  const [color, setColor] = useState("");
  const [usageType, setUsageType] = useState<UsageType>("PRIVATE");
  const [policy, setPolicy] = useState<DealerPolicy | null>(null);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [forgoneOfferIds, setForgoneOfferIds] = useState<string[]>([]);
  const [extras, setExtras] = useState<QuoteExtras>({ accessories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trimsForYear = useMemo(
    () => modelDetail?.trimsByYear[String(selectedYear)] ?? [],
    [modelDetail, selectedYear],
  );

  function applyVehicle(nextVehicle: VehicleDetail) {
    setVehicle(nextVehicle);
    setSelectedYear(nextVehicle.year);
    setCategoryId(nextVehicle.category.id);
    setColor(nextVehicle.defaultColor ?? "");
    const stored = loadPolicyChoices(nextVehicle.id, defaultPolicyChoices());
    setUsageType(stored.usageType);
    setSelectedOfferIds(stored.selectedOfferIds);
    setForgoneOfferIds(stored.forgoneOfferIds);
    setExtras(loadExtras(nextVehicle.id, extrasFromVehicle(nextVehicle)));
    saveVehicleCache(nextVehicle.id, nextVehicle);
  }

  useEffect(() => {
    if (!brandCode || !modelName) {
      return;
    }
    setLoading(true);
    Promise.all([api.getModelDetail(brandCode, modelName), api.getCategories(), api.getLocations(), api.getDealerPolicy()])
      .then(([detail, nextCategories, nextLocations, nextPolicy]) => {
        setModelDetail(detail);
        setCategories(nextCategories);
        setLocations(nextLocations);
        saveCategoryCache(nextCategories);
        saveLocationCache(nextLocations);
        setPolicy(nextPolicy);
        const initial = defaultSelection(detail, preferredVehicleId);
        if (initial.vehicle) {
          applyVehicle(initial.vehicle);
          setSelectedYear(initial.year);
        } else {
          setSelectedYear(detail.defaultYear);
        }
        const hanoi = nextLocations.find((item) => item.code === "HN");
        const defaultLocationId = hanoi?.id ?? nextLocations[0]?.id;
        if (defaultLocationId) {
          api
            .getLocationDistricts(defaultLocationId)
            .then((districts) => {
              setFeeFallback({
                locationId: defaultLocationId,
                districtId: districts[0]?.id,
              });
            })
            .catch(() => {
              setFeeFallback({ locationId: defaultLocationId });
            });
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [brandCode, modelName, preferredVehicleId]);

  function selectYear(year: number) {
    if (!modelDetail) {
      return;
    }
    setSelectedYear(year);
    const trims = modelDetail.trimsByYear[String(year)] ?? [];
    const sameName = vehicle ? trims.find((item) => item.name === vehicle.name) : undefined;
    const nextVehicle = sameName ?? trims[0];
    if (nextVehicle) {
      applyVehicle(nextVehicle);
    }
  }

  function selectTrim(vehicleId: number) {
    if (!modelDetail) {
      return;
    }
    const match = findVehicleInDetail(modelDetail, vehicleId);
    if (match) {
      applyVehicle(match);
    }
  }

  const feeLocation = resolveQuoteFeeLocation(customerFields, feeFallback);
  const vehicleId = vehicle?.id ?? 0;

  async function goToQuote(event: FormEvent) {
    event.preventDefault();
    if (!vehicleId || !feeLocation.locationId || !feeLocation.districtId || !vehicle) {
      return;
    }
    const delivery = resolveDeliveryAddress(customerFields);
    const deliveryDistricts = delivery.locationId
      ? await api.getLocationDistricts(delivery.locationId).catch(() => [])
      : [];
    const customerAddress = composeStructuredAddress(delivery, locations, deliveryDistricts, lang);
    const query = new URLSearchParams();
    query.set("locationId", String(feeLocation.locationId));
    query.set("districtId", String(feeLocation.districtId));
    if (categoryId) {
      query.set("categoryId", String(categoryId));
    }
    if (includeOptional) {
      query.set("optional", "1");
    }
    if (customerFields.customerId) {
      query.set("customerId", String(customerFields.customerId));
    }
    if (customerFields.fullName.trim()) {
      query.set("name", customerFields.fullName.trim());
    }
    if (customerFields.phone.trim()) {
      query.set("phone", customerFields.phone.trim());
    }
    if (customerFields.deliveryAddressKind) {
      query.set("deliveryKind", customerFields.deliveryAddressKind);
    }
    if (delivery.streetLine.trim()) {
      query.set("street", delivery.streetLine.trim());
    }
    if (customerAddress.trim()) {
      query.set("address", customerAddress.trim());
    }
    if (!customerFields.customerId) {
      appendAddressParams(query, "permanent", customerFields.permanentAddress);
      appendAddressParams(query, "temporary", customerFields.temporaryAddress);
    }
    if (color) {
      query.set("color", color);
    }
    query.set("usage", usageType === "COMMERCIAL" ? "commercial" : "private");
    const discountAmount =
      policy && vehicle
        ? priceVehicleFromPolicy(policy, vehicle.listPrice, usageType, selectedOfferIds, forgoneOfferIds)
            .discountAmount
        : vehicle.discountAmount;
    saveExtras(vehicleId, { ...extras, discountAmount });
    saveVehicleCache(vehicleId, vehicle);
    savePolicyChoices(vehicleId, { usageType, selectedOfferIds, forgoneOfferIds });
    router.push(`/brand/${brandCode}/vehicles/${vehicleId}/on-road?${query.toString()}`);
  }

  if (loading) {
    return <PageLoadingScreen message={t("loadingVehicle")} />;
  }

  if (!modelDetail || !vehicle) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
          <p className="text-ink/70">{error ?? t("vehicleNotFound")}</p>
          <Link href={`/brand/${brandCode}`} className="mt-4 inline-block text-copper">
            {t("backCatalog")}
          </Link>
        </div>
      </div>
    );
  }

  const specEntries = Object.entries(vehicle.specifications ?? {});
  const slideUrls = buildColorSlideUrls(color || vehicle.defaultColor, vehicle.colorPhotos, vehicle.defaultColor);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-page px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={`/brand/${brandCode}`}
          className="inline-flex items-center text-sm font-medium text-ink/55 hover:text-ink"
        >
          ← {t("backCatalog")}
        </Link>

        <form onSubmit={goToQuote}>
          <header className="mt-5 rounded-3xl border border-ink/8 bg-white p-5 shadow-card sm:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-ink/45">{vehicle.brand}</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-3xl text-ink sm:text-4xl">{modelDetail.model}</h1>
                <p className="mt-2 text-sm text-ink/60 sm:text-base">
                  {vehicle.name} · {vehicle.year} · {codedOption(vehicle.vehicleType, t)}
                </p>
              </div>
              <div className="shrink-0 rounded-2xl bg-mist px-5 py-3 sm:text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/45">{t("listPrice")}</p>
                <p className="font-display text-2xl text-copper sm:text-3xl">{formatVnd(vehicle.listPrice)}</p>
              </div>
            </div>
          </header>

          <div className="mt-4">
            <ModelConfigBar
              years={modelDetail.years}
              selectedYear={selectedYear}
              onYearChange={selectYear}
              trims={trimsForYear}
              selectedVehicleId={vehicleId}
              onTrimChange={selectTrim}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8">
            <section className="min-w-0 space-y-6">
              <VehicleImageSlideshow
                key={`${vehicleId}-${color || vehicle.defaultColor || "default"}`}
                slides={slideUrls}
                alt={vehicle.name}
              />

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Spec label={t("specCategory")} value={t(`category.${vehicle.category.code}`)} />
                <Spec label={t("specSeats")} value={vehicle.seats ? String(vehicle.seats) : "—"} />
                <Spec label={t("specEngine")} value={vehicle.engineCc ? `${vehicle.engineCc} cc` : codedOption(vehicle.fuelType, t)} />
                <Spec label={t("specFuel")} value={codedOption(vehicle.fuelType, t)} />
                <Spec label={t("specTransmission")} value={codedOption(vehicle.transmission, t)} />
                <Spec label={t("specYear")} value={String(vehicle.year)} />
                {specEntries.map(([key, value]) => (
                  <Spec key={key} label={key} value={value} />
                ))}
              </dl>
            </section>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-ink/8 bg-white p-4 shadow-card sm:p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-copper">{t("calculateTitle")}</p>
                <h2 className="mt-2 font-display text-2xl">{t("confirmDetails")}</h2>

                <p className="mt-5 text-sm font-medium">{t("usageType")}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUsageType("PRIVATE")}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                      usageType === "PRIVATE" ? "border-ink bg-mist" : "border-ink/10 bg-paper"
                    }`}
                  >
                    <User className="mb-1 h-4 w-4 text-copper" />
                    <span className="block font-semibold">{t("usagePrivate")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsageType("COMMERCIAL")}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                      usageType === "COMMERCIAL" ? "border-ink bg-mist" : "border-ink/10 bg-paper"
                    }`}
                  >
                    <Briefcase className="mb-1 h-4 w-4 text-copper" />
                    <span className="block font-semibold">{t("usageCommercial")}</span>
                  </button>
                </div>

                <label className="mt-5 block text-sm font-medium">{t("vehicleCategory")}</label>
                <select
                  value={categoryId ?? ""}
                  onChange={(event) => setCategoryId(Number(event.target.value))}
                  className="mt-1 h-12 w-full rounded-xl border border-ink/10 bg-paper px-3"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {t(`category.${category.code}`)}
                    </option>
                  ))}
                </select>
                {categoryId !== vehicle.category.id && (
                  <p className="mt-2 text-xs text-copper">{t("categoryOverride")}</p>
                )}

                <CustomerPicker locations={locations} value={customerFields} onChange={setCustomerFields} />

                <label className="mt-5 block text-sm font-medium">{t("vehicleColor")}</label>
                <div className="mt-2 flex min-w-0 items-center gap-3">
                  <ColorPhotoImage
                    src={colorPhoto(color, vehicle.colorPhotos)}
                    alt={color}
                    wrapperClassName="h-14 w-[5.5rem] shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-paper"
                    imgClassName="h-full w-full object-contain"
                    spinnerSize="sm"
                  />
                  <select
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-ink/10 bg-paper px-3 text-ink"
                  >
                    {(vehicle.availableColors ?? vehicle.defaultColor ?? "Trắng")
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                  </select>
                </div>

                <p className="mt-5 text-sm font-medium">{t("dealerPolicyTitle")}</p>
                {policy && (
                  <p className="mt-2 text-xs font-medium text-ink/70">
                    {t("usageDiscount")}:{" "}
                    {usageType === "COMMERCIAL" ? policy.commercialDiscountPercent : policy.privateDiscountPercent}%
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {(policy?.offers ?? []).map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      selected={selectedOfferIds.includes(offer.id)}
                      forgone={forgoneOfferIds.includes(offer.id)}
                      onTake={() => {
                        setForgoneOfferIds((current) => current.filter((item) => item !== offer.id));
                        setSelectedOfferIds((current) => current.filter((item) => item !== offer.id));
                      }}
                      onForgo={() => {
                        setSelectedOfferIds((current) => current.filter((item) => item !== offer.id));
                        setForgoneOfferIds((current) => [...current.filter((item) => item !== offer.id), offer.id]);
                      }}
                      onToggle={(checked) => {
                        setSelectedOfferIds((current) =>
                          checked
                            ? [...current.filter((item) => item !== offer.id), offer.id]
                            : current.filter((item) => item !== offer.id),
                        );
                      }}
                      t={t}
                      lang={lang}
                    />
                  ))}
                </div>

                <label className="mt-5 flex items-start gap-3 rounded-2xl bg-paper px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={includeOptional}
                    onChange={(event) => setIncludeOptional(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{t("optionalInsurance")}</span>
                    <span className="mt-1 block text-xs text-ink/55">{t("optionalInsuranceHint")}</span>
                  </span>
                </label>

                {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

                <button
                  type="submit"
                  disabled={!feeLocation.locationId || !feeLocation.districtId}
                  className={`mt-6 hidden h-12 w-full rounded-xl bg-ink text-sm font-semibold text-paper disabled:opacity-60 lg:inline-flex lg:items-center lg:justify-center ${motionInteractive} ${motionPress} hover:bg-forest`}
                >
                  {t("calculateButton")}
                </button>
              </div>
            </aside>
          </div>

          <div className="sticky bottom-0 z-20 -mx-4 mt-5 border-t border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 lg:hidden">
            <button
              type="submit"
              disabled={!feeLocation.locationId || !feeLocation.districtId}
              className={`h-12 w-full rounded-xl bg-ink text-sm font-semibold text-paper disabled:opacity-60 ${motionInteractive} ${motionPress} hover:bg-forest`}
            >
              {t("calculateButton")}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-card">
      <dt className="text-xs uppercase tracking-[0.14em] text-ink/45">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function OfferCard({
  offer,
  selected,
  forgone,
  onTake,
  onForgo,
  onToggle,
  t,
  lang,
}: {
  offer: DealerOffer;
  selected: boolean;
  forgone: boolean;
  onTake: () => void;
  onForgo: () => void;
  onToggle: (checked: boolean) => void;
  t: (key: string) => string;
  lang: Lang;
}) {
  const title = localizedPolicyText(offer.title, lang);
  const description = localizedPolicyText(offer.description, lang);
  if (offer.kind === "FORGO_FOR_CREDIT") {
    return (
      <div className="rounded-xl border border-ink/10 bg-paper px-3 py-2">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Gift className="h-3.5 w-3.5 text-copper" />
          {title}
        </p>
        <p className="mt-1 text-[11px] text-ink/55">{description}</p>
        <div className="mt-2 grid gap-1.5">
          <label className="text-sm">
            <input type="radio" className="mr-2" checked={!forgone} onChange={onTake} />
            {t("offerTakeGift")}
          </label>
          <label className="text-sm">
            <input type="radio" className="mr-2" checked={forgone} onChange={onForgo} />
            {t("offerForgoGift")}
            {offer.amount ? ` · ${formatVnd(offer.amount)}` : ""}
          </label>
        </div>
      </div>
    );
  }
  return (
    <label className="flex items-start gap-2 rounded-xl border border-ink/10 bg-paper px-3 py-2">
      <input type="checkbox" className="mt-1" checked={selected} onChange={(event) => onToggle(event.target.checked)} />
      <span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Percent className="h-3.5 w-3.5 text-copper" />
          {title}
        </span>
        <span className="mt-1 block text-[11px] text-ink/55">{description}</span>
      </span>
    </label>
  );
}
