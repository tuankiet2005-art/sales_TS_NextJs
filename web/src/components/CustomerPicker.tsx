"use client";

import { Search, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../api/client";
import { useI18n } from "../i18n/LanguageContext";
import {
  addressHasLocality,
  composeStructuredAddress,
  customerFieldsFromCustomer,
  customerInputFromFields,
  emptyCustomerFields,
  emptyStructuredAddress,
  type CustomerAddressKind,
  type CustomerFieldValues,
  type StructuredAddress,
} from "../lib/customerAddress";
import { softIncludes } from "../lib/softSearch";
import { customerApiErrorMessage } from "../lib/customerApiError";
import type { Customer, Location, LocationDistrict } from "../types";
import { AddressCombobox } from "./AddressCombobox";

export type { CustomerFieldValues };

const fieldClass =
  "h-12 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm text-ink outline-none ring-copper/30 placeholder:text-ink/40 focus:ring-2";

function useDistrictMap(locationIds: Array<number | undefined>) {
  const [districtsByLocation, setDistrictsByLocation] = useState<Record<number, LocationDistrict[]>>({});

  useEffect(() => {
    const ids = [...new Set(locationIds.filter((id): id is number => Boolean(id)))];
    if (ids.length === 0) {
      return;
    }
    let cancelled = false;
    void Promise.all(
      ids.map(async (locationId) => {
        const rows = await api.getLocationDistricts(locationId).catch(() => []);
        return [locationId, rows] as const;
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      setDistrictsByLocation((prev) => {
        const next = { ...prev };
        for (const [locationId, rows] of entries) {
          next[locationId] = rows;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [locationIds.join(",")]);

  return districtsByLocation;
}

function allDistricts(map: Record<number, LocationDistrict[]>) {
  return Object.values(map).flat();
}

export function CustomerPicker({
  locations,
  value,
  onChange,
  compact = false,
}: {
  locations: Location[];
  value: CustomerFieldValues;
  onChange: (next: CustomerFieldValues) => void;
  compact?: boolean;
}) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState(value.fullName);
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLinked = Boolean(value.customerId);
  const showDetails = value.fullName.trim().length > 0;

  const districtMap = useDistrictMap([
    value.permanentAddress.locationId,
    value.temporaryAddress.locationId,
  ]);
  const districts = allDistricts(districtMap);

  const deliveryOptions = useMemo(() => {
    const options: Array<{ kind: CustomerAddressKind; label: string; enabled: boolean }> = [
      {
        kind: "PERMANENT",
        label: t("customer.permanentAddress"),
        enabled: addressHasLocality(value.permanentAddress) || Boolean(value.permanentAddress.streetLine.trim()),
      },
      {
        kind: "TEMPORARY",
        label: t("customer.temporaryAddress"),
        enabled: addressHasLocality(value.temporaryAddress) || Boolean(value.temporaryAddress.streetLine.trim()),
      },
    ];
    return options.filter((item) => item.enabled);
  }, [t, value.permanentAddress, value.temporaryAddress]);

  const deliveryKind =
    value.deliveryAddressKind &&
    deliveryOptions.some((item) => item.kind === value.deliveryAddressKind)
      ? value.deliveryAddressKind
      : deliveryOptions[0]?.kind;

  const deliveryPreview = useMemo(() => {
    if (!deliveryKind) {
      return "";
    }
    const address =
      deliveryKind === "TEMPORARY" ? value.temporaryAddress : value.permanentAddress;
    return composeStructuredAddress(address, locations, districts, lang);
  }, [deliveryKind, districts, lang, locations, value.permanentAddress, value.temporaryAddress]);

  useEffect(() => {
    setQuery(value.fullName);
  }, [value.fullName]);

  useEffect(() => {
    if (!showDetails || deliveryOptions.length === 0) {
      if (value.deliveryAddressKind) {
        patch({ deliveryAddressKind: undefined });
      }
      return;
    }
    if (!deliveryKind || deliveryKind === value.deliveryAddressKind) {
      return;
    }
    patch({ deliveryAddressKind: deliveryKind });
  }, [deliveryKind, deliveryOptions.length, showDetails, value.deliveryAddressKind]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .listCustomers({ query: query.trim() || undefined, pageSize: 12 })
      .then((result) => {
        if (!cancelled) {
          setCustomers(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCustomers([]);
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
  }, [open, query]);

  const matches = useMemo(
    () => customers.filter((item) => softIncludes(query, item.fullName, item.phone ?? "")),
    [customers, query],
  );

  const showCreate =
    query.trim().length > 0 &&
    !matches.some((item) => item.fullName.trim().toLowerCase() === query.trim().toLowerCase());

  function patch(next: Partial<CustomerFieldValues>) {
    onChange({ ...value, ...next });
  }

  function patchAddress(kind: CustomerAddressKind, next: Partial<StructuredAddress>) {
    const key = kind === "PERMANENT" ? "permanentAddress" : "temporaryAddress";
    patch({
      [key]: { ...value[key], ...next },
      customerId: undefined,
    });
  }

  function clearCustomer() {
    onChange(emptyCustomerFields());
    setQuery("");
    setError(null);
  }

  function handleNameChange(next: string) {
    setQuery(next);
    if (!next.trim()) {
      clearCustomer();
      return;
    }
    patch({ fullName: next, customerId: undefined });
  }

  function selectCustomer(customer: Customer) {
    onChange(customerFieldsFromCustomer(customer));
    setQuery(customer.fullName);
    setOpen(false);
    setError(null);
  }

  function confirmNewCustomer(fullName: string) {
    const trimmed = fullName.trim();
    if (!trimmed) {
      setError(t("customer.fullNameRequired"));
      return;
    }
    patch({
      fullName: trimmed,
      customerId: undefined,
    });
    setQuery(trimmed);
    setOpen(false);
    setError(null);
  }

  async function saveCustomerProfile() {
    const fullName = query.trim() || value.fullName.trim();
    if (!fullName) {
      setError(t("customer.fullNameRequired"));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await api.createCustomer(customerInputFromFields({ ...value, fullName }));
      selectCustomer(created);
    } catch (err) {
      setError(customerApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  const shellClass = compact
    ? "rounded-xl border border-ink/8 bg-paper/50 p-3"
    : "mt-5 rounded-2xl border border-ink/8 bg-paper/50 p-4 sm:p-5";

  return (
    <section className={shellClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{t("customer.section")}</h3>
        <div className="flex items-center gap-3 text-xs">
          {isLinked ? (
            <span className="rounded-full bg-forest/10 px-2.5 py-1 font-medium text-forest">
              {t("customer.linked")}
            </span>
          ) : showDetails ? (
            <span className="rounded-full bg-copper/10 px-2.5 py-1 font-medium text-copper">
              {t("customer.new")}
            </span>
          ) : null}
          <Link href="/customers" className="font-medium text-copper hover:text-ink">
            {t("customer.manage")}
          </Link>
        </div>
      </div>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          value={open ? query : value.fullName}
          onChange={(event) => {
            handleNameChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            event.preventDefault();
            if (creating || loading) {
              return;
            }
            const currentQuery = event.currentTarget.value.trim();
            if (!currentQuery) {
              return;
            }
            const currentMatches = customers.filter((item) =>
              softIncludes(currentQuery, item.fullName, item.phone ?? ""),
            );
            const canCreate =
              !currentMatches.some(
                (item) => item.fullName.trim().toLowerCase() === currentQuery.toLowerCase(),
              );
            if (canCreate) {
              confirmNewCustomer(currentQuery);
              return;
            }
            if (currentMatches.length === 1) {
              selectCustomer(currentMatches[0]);
            }
          }}
          onFocus={() => {
            setQuery(value.fullName);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 140);
          }}
          placeholder={t("customer.searchPlaceholder")}
          aria-label={t("customer.section")}
          className={`${fieldClass} pl-10`}
          autoComplete="name"
        />
        {open && (
          <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-ink/10 bg-white shadow-card">
            <ul className="max-h-52 overflow-y-auto py-1">
              {loading && <li className="px-3 py-2.5 text-sm text-ink/50">{t("loadingApp")}</li>}
              {!loading &&
                matches.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-mist/80"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectCustomer(item)}
                    >
                      <span className="font-medium text-ink">{item.fullName}</span>
                      <span className="shrink-0 tabular-nums text-ink/55">{item.phone || "—"}</span>
                    </button>
                  </li>
                ))}
              {!loading && matches.length === 0 && !showCreate && (
                <li className="px-3 py-2.5 text-sm text-ink/50">{t("customer.noMatches")}</li>
              )}
            </ul>
            {!loading && showCreate && (
              <div className="border-t border-ink/8 bg-paper/40 p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-paper hover:bg-forest"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => confirmNewCustomer(query)}
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  {t("customer.useNewName")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {showDetails && (
        <>
          <div className="mt-4">
            <label className="block text-xs font-medium text-ink/60">
              {t("customer.phone")}
              <input
                value={value.phone}
                onChange={(event) => patch({ phone: event.target.value, customerId: undefined })}
                className={`${fieldClass} mt-1.5`}
                autoComplete="tel"
                inputMode="tel"
              />
            </label>
          </div>

          {!isLinked && (
            <div className="mt-4 space-y-4 border-t border-ink/8 pt-4">
              <AddressSection
                title={t("customer.permanentAddress")}
                locations={locations}
                address={value.permanentAddress}
                onChange={(next) => patchAddress("PERMANENT", next)}
                compact={compact}
              />
              <AddressSection
                title={t("customer.temporaryAddress")}
                locations={locations}
                address={value.temporaryAddress}
                onChange={(next) => patchAddress("TEMPORARY", next)}
                compact={compact}
              />
            </div>
          )}

          <div className="mt-4 border-t border-ink/8 pt-4">
            <label className="block text-xs font-medium text-ink/60">
              {t("customer.deliveryAddress")}
              {deliveryOptions.length > 0 ? (
                <select
                  value={deliveryKind ?? ""}
                  onChange={(event) =>
                    patch({ deliveryAddressKind: event.target.value as CustomerAddressKind })
                  }
                  className={`${fieldClass} mt-1.5`}
                >
                  {deliveryOptions.map((item) => (
                    <option key={item.kind} value={item.kind}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1.5 rounded-xl border border-dashed border-ink/15 bg-white px-3 py-2.5 text-sm text-ink/50">
                  {t("customer.noDeliveryAddress")}
                </p>
              )}
            </label>
            {deliveryPreview ? (
              <p className="mt-2 rounded-xl bg-white px-3 py-2.5 text-sm text-ink">{deliveryPreview}</p>
            ) : null}
          </div>

          {!isLinked && (
            <div className="mt-4 border-t border-ink/8 pt-4">
              <button
                type="button"
                disabled={creating}
                onClick={() => void saveCustomerProfile()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-paper hover:bg-forest disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                {creating ? t("customer.saving") : t("customer.saveProfile")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AddressSection({
  title,
  locations,
  address,
  onChange,
  compact,
}: {
  title: string;
  locations: Location[];
  address: StructuredAddress;
  onChange: (next: Partial<StructuredAddress>) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink/50">{title}</p>
      <AddressCombobox
        variant="form"
        compact={compact}
        locations={locations}
        locationId={address.locationId}
        districtId={address.districtId}
        streetLine={address.streetLine}
        onLocationChange={(locationId) => onChange({ locationId, districtId: undefined })}
        onDistrictChange={(districtId) => onChange({ districtId })}
        onStreetChange={(streetLine) => onChange({ streetLine })}
      />
    </div>
  );
}

export { customerFieldsFromCustomer, emptyCustomerFields, emptyStructuredAddress };
