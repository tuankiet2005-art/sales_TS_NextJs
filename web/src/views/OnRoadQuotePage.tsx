"use client";
import { ArrowLeft, FileSpreadsheet, FileText, Languages, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "../api/client";
import { CustomerPicker } from "../components/CustomerPicker";
import { customerFieldsFromCustomer } from "../lib/customerAddress";
import { Header } from "../components/Header";
import { PageLoadingScreen } from "../components/LoadingState";
import { QuoteAccessoriesPanel, QuotePricePanel } from "../components/QuoteAdjustments";
import { QuoteBankLoanPanel } from "../components/QuoteBankLoanPanel";
import { QuoteSheet } from "../components/QuoteSheet";
import { useI18n } from "../i18n/LanguageContext";
import { languages, type Lang } from "../i18n/translations";
import { quoteDiscountWithRelationship } from "../lib/customerRelationshipDiscount";
import { downloadQuotePdf } from "../lib/exportQuotePdf";
import {
  composeStructuredAddress,
  resolveDeliveryAddress,
  resolveQuoteFeeLocation,
  type CustomerAddressKind,
  type CustomerFieldValues,
  type StructuredAddress,
} from "../lib/customerAddress";
import { loadLocationCache, saveLocationCache } from "../lib/catalogReferenceCache";
import { motionInteractive, motionPress } from "../lib/motion";
import { DEFAULT_QUOTE_BANK_LOAN, pickDefaultConsultingEmployee, resolveQuoteBankLoan } from "../lib/quoteBankLoan";
import { extrasFromQuote, extrasFromVehicle, extrasStorageKey, loadExtras, saveExtras } from "../lib/quoteExtras";
import { modelToSlug } from "../lib/modelSlug";
import { loadVehicleCache, saveVehicleCache } from "../lib/vehicleCache";
import { defaultPolicyChoices, loadPolicyChoices } from "../lib/quotePolicy";
import type {
  Bank,
  ConsultingEmployee,
  CostBreakdown as CostBreakdownType,
  Location,
  LocationDistrict,
  QuoteExtras,
  VehicleDetail,
} from "../types";

export function OnRoadQuotePage() {
  const params = useParams() ?? {};
  const vehicleId = typeof params.vehicleId === "string" ? params.vehicleId : "";
  const brandCode = typeof params.brandCode === "string" ? params.brandCode : "";
  const id = Number(vehicleId);
  const searchParams = useSearchParams();
  const { t, lang } = useI18n();
  const [exportLang, setExportLang] = useState<Lang>(lang);

  useEffect(() => {
    setExportLang(lang);
  }, [lang]);

  const locationId = Number(searchParams?.get("locationId"));
  const initialDistrictId = searchParams?.get("districtId") ? Number(searchParams.get("districtId")) : undefined;
  const initialAddress = searchParams?.get("address") ?? "";
  const initialStreet = searchParams?.get("street") ?? "";
  const initialPhone = searchParams?.get("phone") ?? "";
  const initialDeliveryKind = searchParams?.get("deliveryKind") as CustomerAddressKind | null;
  const initialCustomerId = searchParams?.get("customerId") ? Number(searchParams.get("customerId")) : undefined;
  const categoryId = searchParams?.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined;
  const includeOptional = searchParams?.get("optional") === "1";
  const [customerFields, setCustomerFields] = useState<CustomerFieldValues>(() =>
    buildCustomerFieldsFromParams({
      locationId,
      districtId: initialDistrictId,
      street: initialStreet,
      address: initialAddress,
      phone: initialPhone,
      deliveryKind: initialDeliveryKind,
      customerId: initialCustomerId,
      name: searchParams?.get("name") ?? "",
      permanent: readAddressParams(searchParams, "permanent"),
      temporary: readAddressParams(searchParams, "temporary"),
    }),
  );
  const [locations, setLocations] = useState<Location[]>(() => loadLocationCache() ?? []);
  const [districts, setDistricts] = useState<LocationDistrict[]>([]);
  const [deliveryDistricts, setDeliveryDistricts] = useState<LocationDistrict[]>([]);
  const color = searchParams?.get("color") ?? "";
  const usageType = searchParams?.get("usage") === "commercial" ? "COMMERCIAL" : "PRIVATE";
  const policyChoices = useMemo(
    () => (id ? loadPolicyChoices(id, { ...defaultPolicyChoices(), usageType }) : defaultPolicyChoices()),
    [id, usageType],
  );
  const selectedOfferIdsKey = policyChoices.selectedOfferIds.join("\0");
  const forgoneOfferIdsKey = policyChoices.forgoneOfferIds.join("\0");

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [result, setResult] = useState<CostBreakdownType | null>(null);
  const [extras, setExtras] = useState<QuoteExtras>({ accessories: [] });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [consultingEmployees, setConsultingEmployees] = useState<ConsultingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const detailsHref = vehicle
    ? `/brand/${brandCode}/models/${modelToSlug(vehicle.model)}?vehicleId=${id}`
    : `/brand/${brandCode}/vehicles/${id}`;

  useEffect(() => {
    if (!initialCustomerId) {
      return;
    }
    api
      .getCustomer(initialCustomerId)
      .then((customer) => setCustomerFields(customerFieldsFromCustomer(customer)))
      .catch(() => undefined);
  }, [initialCustomerId]);

  useEffect(() => {
    api.getLocations().then((rows) => {
      setLocations(rows);
      saveLocationCache(rows);
    });
  }, []);

  useEffect(() => {
    api
      .getBanks()
      .then(setBanks)
      .catch((error) => {
        console.error("[quote] Failed to load banks:", error);
        setBanks([]);
      });
    api
      .getConsultingEmployees()
      .then(setConsultingEmployees)
      .catch((error) => {
        console.error("[quote] Failed to load consulting employees:", error);
        setConsultingEmployees([]);
      });
  }, []);

  useEffect(() => {
    if (banks.length === 0 && consultingEmployees.length === 0) {
      return;
    }
    setExtras((prev) => {
      const current = resolveQuoteBankLoan(prev.bankLoan);
      const bank = banks.find((item) => item.id === current.bankId) ?? banks[0];
      const employee =
        consultingEmployees.find((item) => item.id === current.consultingEmployeeId) ??
        pickDefaultConsultingEmployee(consultingEmployees);
      const nextBankLoan = {
        ...current,
        bankId: bank?.id,
        bankName: bank?.name,
        consultingEmployeeId: employee?.id,
        consultingEmployeeName: employee?.name,
        consultingEmployeePhone: employee?.phone,
      };
      if (
        prev.bankLoan?.bankId === nextBankLoan.bankId &&
        prev.bankLoan?.bankName === nextBankLoan.bankName &&
        prev.bankLoan?.consultingEmployeeId === nextBankLoan.consultingEmployeeId &&
        prev.bankLoan?.consultingEmployeeName === nextBankLoan.consultingEmployeeName &&
        prev.bankLoan?.consultingEmployeePhone === nextBankLoan.consultingEmployeePhone
      ) {
        return prev;
      }
      return { ...prev, bankLoan: nextBankLoan };
    });
  }, [banks, consultingEmployees]);

  const feeLocation = resolveQuoteFeeLocation(customerFields, {
    locationId: locationId || undefined,
    districtId: initialDistrictId,
  });
  const quoteLocationId = feeLocation.locationId ?? locationId;
  const deliveryAddress = resolveDeliveryAddress(customerFields);

  useEffect(() => {
    if (!quoteLocationId) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    api
      .getLocationDistricts(quoteLocationId)
      .then((rows) => {
        if (!cancelled) {
          setDistricts(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDistricts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [quoteLocationId]);

  useEffect(() => {
    if (!deliveryAddress.locationId) {
      setDeliveryDistricts([]);
      return;
    }
    let cancelled = false;
    api
      .getLocationDistricts(deliveryAddress.locationId)
      .then((rows) => {
        if (!cancelled) {
          setDeliveryDistricts(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeliveryDistricts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [deliveryAddress.locationId]);

  const customerAddress = useMemo(() => {
    const composed = composeStructuredAddress(deliveryAddress, locations, deliveryDistricts, lang);
    return composed || initialAddress;
  }, [deliveryAddress, deliveryDistricts, initialAddress, lang, locations]);

  const customerName = customerFields.fullName;

  useEffect(() => {
    const effectiveListPrice = extras.listPrice ?? vehicle?.listPrice;
    if (!customerFields.customerId || !effectiveListPrice) {
      setExtras((prev) => {
        if (!prev.relationshipDiscount) {
          return prev;
        }
        const base = prev.basePolicyDiscountAmount ?? prev.discountAmount ?? 0;
        const { relationshipDiscount, ...rest } = prev;
        return { ...rest, discountAmount: base };
      });
      return;
    }

    let cancelled = false;
    api
      .getCustomerRelationshipDiscount(customerFields.customerId, effectiveListPrice)
      .then(({ offer }) => {
        if (cancelled) {
          return;
        }
        setExtras((prev) => {
          const base = prev.basePolicyDiscountAmount ?? prev.discountAmount ?? 0;
          if (!offer) {
            if (!prev.relationshipDiscount) {
              return prev;
            }
            const { relationshipDiscount, ...rest } = prev;
            return { ...rest, discountAmount: base };
          }
          const nextDiscount = quoteDiscountWithRelationship(base, offer);
          if (
            prev.relationshipDiscount?.relatedCustomerId === offer.relatedCustomerId &&
            prev.relationshipDiscount?.discountAmount === offer.discountAmount &&
            prev.discountAmount === nextDiscount
          ) {
            return prev;
          }
          return {
            ...prev,
            relationshipDiscount: offer,
            discountAmount: nextDiscount,
          };
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [customerFields.customerId, vehicle?.listPrice, extras.listPrice]);

  useEffect(() => {
    if (!id || !locationId) {
      setLoading(false);
      setError(t("missingQuoteParams"));
      return;
    }

    let cancelled = false;
    setError(null);

    const cachedVehicle = loadVehicleCache(id);
    const extrasForCalc =
      typeof sessionStorage !== "undefined" && sessionStorage.getItem(extrasStorageKey(id))
        ? loadExtras(id, { accessories: [] })
        : undefined;

    if (cachedVehicle) {
      setVehicle(cachedVehicle);
      setExtras(loadExtras(id, extrasFromVehicle(cachedVehicle)));
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function fetchQuoteData() {
      try {
        if (cachedVehicle) {
          const breakdown = await api.calculateOnRoadCost(
            id,
            locationId,
            includeOptional,
            categoryId,
            extrasForCalc,
            policyChoices.usageType,
            policyChoices.selectedOfferIds,
            policyChoices.forgoneOfferIds,
          );
          if (cancelled) {
            return;
          }
          setExtras(loadExtras(id, { ...extrasFromQuote(cachedVehicle, breakdown), bankLoan: DEFAULT_QUOTE_BANK_LOAN }));
          setResult(breakdown);
          return;
        }

        const loaded = await api.loadQuotePage(
          id,
          locationId,
          includeOptional,
          categoryId,
          extrasForCalc,
          policyChoices.usageType,
          policyChoices.selectedOfferIds,
          policyChoices.forgoneOfferIds,
        );
        if (cancelled) {
          return;
        }
        setVehicle(loaded.vehicle);
        setExtras(loadExtras(id, { ...extrasFromQuote(loaded.vehicle, loaded.breakdown), bankLoan: DEFAULT_QUOTE_BANK_LOAN }));
        setResult(loaded.breakdown);
      } catch (firstError) {
        if (cancelled) {
          return;
        }
        if (cachedVehicle) {
          try {
            const loaded = await api.loadQuotePage(
              id,
              locationId,
              includeOptional,
              categoryId,
              extrasForCalc,
              policyChoices.usageType,
              policyChoices.selectedOfferIds,
              policyChoices.forgoneOfferIds,
            );
            if (cancelled) {
              return;
            }
            setVehicle(loaded.vehicle);
            saveVehicleCache(id, loaded.vehicle);
            setExtras(loadExtras(id, { ...extrasFromQuote(loaded.vehicle, loaded.breakdown), bankLoan: DEFAULT_QUOTE_BANK_LOAN }));
            setResult(loaded.breakdown);
            return;
          } catch {
            // Keep cached vehicle + adjustable panel visible with session/vehicle extras.
          }
        }
        setError(firstError instanceof Error ? firstError.message : t("apiError"));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchQuoteData();

    return () => {
      cancelled = true;
    };
  }, [id, brandCode, locationId, categoryId, includeOptional, policyChoices.usageType, selectedOfferIdsKey, forgoneOfferIdsKey, t]);

  async function exportQuote() {
    if (!id || !quoteLocationId) {
      setError(t("missingQuoteParams"));
      return;
    }
    const name = customerName.trim() || t("customerName");
    setExporting("xlsx");
    setError(null);
    setNotice(null);
    saveExtras(id, extras);
    try {
      const blob = await api.exportQuote({ ...quotePayload(name), breakdown: result ?? undefined });
      setNotice(t("quoteHistory.saved"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quote-${vehicle?.model ?? "mitsubishi"}-${exportLang}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setExporting(null);
    }
  }

  async function exportQuotePdf() {
    const sheet = document.getElementById("quote-sheet");
    if (!sheet) {
      setError(t("apiError"));
      return;
    }
    setExporting("pdf");
    setError(null);
    setNotice(null);
    try {
      const name = customerName.trim() || t("customerName");
      try {
        await api.saveQuote({ ...quotePayload(name), breakdown: result ?? undefined });
        setNotice(t("quoteHistory.saved"));
      } catch {
        setNotice(null);
      }
      await downloadQuotePdf(sheet, `quote-${vehicle?.model ?? "mitsubishi"}-${exportLang}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setExporting(null);
    }
  }

  function quotePayload(name: string) {
    return {
      vehicleId: id,
      locationId: quoteLocationId,
      categoryId,
      includeOptionalInsurance: includeOptional,
      customerId: customerFields.customerId,
      customerName: name,
      customerAddress: customerAddress.trim(),
      color,
      language: exportLang,
      extras,
      usageType: policyChoices.usageType,
      selectedOfferIds: policyChoices.selectedOfferIds,
      forgoneOfferIds: policyChoices.forgoneOfferIds,
    };
  }

  async function recalculate() {
    if (!id || !quoteLocationId) {
      return;
    }
    setCalculating(true);
    setError(null);
    saveExtras(id, extras);
    try {
      const breakdown = await api.calculateOnRoadCost(
        id,
        quoteLocationId,
        includeOptional,
        categoryId,
        extras,
        policyChoices.usageType,
        policyChoices.selectedOfferIds,
        policyChoices.forgoneOfferIds
      );
      setResult(breakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setCalculating(false);
    }
  }

  if (loading && !vehicle) {
    return <PageLoadingScreen message={t("calculating")} />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-page px-4 py-5 sm:px-6 sm:py-6 print:max-w-none print:px-0">
        <div className="mb-4 print:hidden">
          <Link href={detailsHref} className="inline-flex items-center gap-1.5 text-sm text-ink/55 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            {t("backToDetails")}
          </Link>
        </div>

        {error && <p className="mb-3 text-sm text-red-700 print:hidden">{error}</p>}
        {notice && <p className="mb-3 text-sm text-forest print:hidden">{notice}</p>}

        {vehicle && (
          <div className="mb-5 grid gap-3 motion-enter print:hidden md:grid-cols-2 md:*:min-w-0">
            <QuotePricePanel
              extras={extras}
              onChange={setExtras}
              action={
                <button
                  type="button"
                  onClick={recalculate}
                  disabled={calculating}
                  className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-ink text-sm font-semibold text-paper disabled:opacity-60 ${motionInteractive} ${motionPress} hover:bg-forest`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${calculating ? "animate-spin" : ""}`} />
                  {calculating ? t("calculating") : t("recalculate")}
                </button>
              }
            />
            <QuoteAccessoriesPanel extras={extras} onChange={setExtras} />
          </div>
        )}

        {vehicle && (
          <div className="mb-5 print:hidden">
            <QuoteBankLoanPanel
              value={resolveQuoteBankLoan(extras.bankLoan)}
              banks={banks}
              employees={consultingEmployees}
              onChange={(bankLoan) => {
                const next = { ...extras, bankLoan };
                setExtras(next);
                if (id) {
                  saveExtras(id, next);
                }
              }}
            />
          </div>
        )}

        {vehicle && result && (
          <div
            className="-mx-4 overflow-x-auto px-4 motion-scale-in sm:-mx-6 sm:px-6 print:mx-0 print:overflow-visible print:px-0"
          >
            <QuoteSheet
              vehicle={vehicle}
              result={result}
              customerName={customerName}
              customerAddress={customerAddress}
              color={color}
              selectedAccessories={extras.accessories}
              language={exportLang}
              bankLoan={resolveQuoteBankLoan(extras.bankLoan)}
            />
          </div>
        )}

        {result && (
          <section className="mt-5 space-y-4 rounded-2xl border border-ink/8 bg-white p-3 shadow-card print:hidden sm:p-4">
            <CustomerPicker
              compact
              locations={locations}
              value={customerFields}
              onChange={setCustomerFields}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-ink/70">
                <Languages className="h-4 w-4 shrink-0 text-copper" />
                <span className="shrink-0">{t("exportLanguage")}</span>
                <select
                  value={exportLang}
                  onChange={(event) => setExportLang(event.target.value as Lang)}
                  className="h-11 min-w-0 flex-1 rounded-md border border-ink/15 bg-paper px-2 text-base font-semibold text-ink sm:h-8 sm:flex-none sm:text-sm"
                >
                  {languages.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={exportQuote}
                  disabled={exporting !== null}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-ink px-4 text-sm font-semibold text-paper hover:bg-forest disabled:opacity-60 sm:h-8"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {exporting === "xlsx" ? t("exporting") : t("exportExcel")}
                </button>
                <button
                  type="button"
                  onClick={exportQuotePdf}
                  disabled={exporting !== null}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60 sm:h-8"
                >
                  <FileText className="h-4 w-4" />
                  {exporting === "pdf" ? t("exportingPdf") : t("exportPdf")}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function readAddressParams(
  searchParams: ReturnType<typeof useSearchParams> | null,
  prefix: "permanent" | "temporary",
): StructuredAddress {
  const streetKey = prefix === "permanent" ? "permanentStreet" : "temporaryStreet";
  const locationKey = prefix === "permanent" ? "permanentLocationId" : "temporaryLocationId";
  const districtKey = prefix === "permanent" ? "permanentDistrictId" : "temporaryDistrictId";
  return {
    streetLine: searchParams?.get(streetKey) ?? "",
    locationId: searchParams?.get(locationKey) ? Number(searchParams.get(locationKey)) : undefined,
    districtId: searchParams?.get(districtKey) ? Number(searchParams.get(districtKey)) : undefined,
  };
}

function buildCustomerFieldsFromParams(input: {
  locationId: number;
  districtId?: number;
  street: string;
  address: string;
  phone: string;
  deliveryKind: CustomerAddressKind | null;
  customerId?: number;
  name: string;
  permanent: StructuredAddress;
  temporary: StructuredAddress;
}): CustomerFieldValues {
  const permanent = { ...input.permanent };
  const temporary = { ...input.temporary };
  if (!permanent.streetLine && !permanent.locationId && input.street) {
    permanent.streetLine = input.street;
    permanent.locationId = input.locationId || undefined;
    permanent.districtId = input.districtId;
  }
  const deliveryAddressKind =
    input.deliveryKind === "TEMPORARY" || input.deliveryKind === "PERMANENT"
      ? input.deliveryKind
      : undefined;
  return {
    customerId: input.customerId,
    fullName: input.name,
    phone: input.phone,
    permanentAddress: permanent,
    temporaryAddress: temporary,
    deliveryAddressKind,
  };
}
