"use client";

import { ChevronRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n/LanguageContext";
import { emptyStructuredAddress } from "../lib/customerAddress";
import { CUSTOMER_RELATIONSHIP_TYPES } from "../lib/customerRelationships";
import { formatVnd } from "../lib/format";
import type { Customer, CustomerDetail, CustomerRelationshipInput, Location } from "../types";
import type { StructuredAddress } from "../lib/customerAddress";
import { AddressCombobox } from "./AddressCombobox";

export type CustomerFormValues = {
  fullName: string;
  phone: string;
  permanentAddress: StructuredAddress;
  temporaryAddress: StructuredAddress;
  notes: string;
  relationships: CustomerRelationshipInput[];
};

const fieldClass =
  "h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm text-ink outline-none ring-copper/30 placeholder:text-ink/40 focus:ring-2";

export function emptyCustomerForm(): CustomerFormValues {
  return {
    fullName: "",
    phone: "",
    permanentAddress: emptyStructuredAddress(),
    temporaryAddress: emptyStructuredAddress(),
    notes: "",
    relationships: [],
  };
}

export function customerFormFromDetail(customer: CustomerDetail): CustomerFormValues {
  return {
    fullName: customer.fullName,
    phone: customer.phone ?? "",
    permanentAddress: {
      streetLine: customer.permanentAddress.streetLine ?? "",
      locationId: customer.permanentAddress.locationId,
      districtId: customer.permanentAddress.districtId,
    },
    temporaryAddress: {
      streetLine: customer.temporaryAddress.streetLine ?? "",
      locationId: customer.temporaryAddress.locationId,
      districtId: customer.temporaryAddress.districtId,
    },
    notes: customer.notes ?? "",
    relationships: customer.relationships.map((item) => ({
      relatedCustomerId: item.relatedCustomer.id,
      relationshipType: item.relationshipType,
      note: item.note,
    })),
  };
}

function FormSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink/8 bg-paper/35 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink/80">{label}</span>
      {children}
    </label>
  );
}

function AddressFields({
  title,
  locations,
  address,
  onChange,
}: {
  title?: string;
  locations: Location[];
  address: StructuredAddress;
  onChange: (next: StructuredAddress) => void;
}) {
  return (
    <div>
      {title ? <p className="mb-2 text-sm font-medium text-ink/80">{title}</p> : null}
      <AddressCombobox
        variant="form"
        locations={locations}
        locationId={address.locationId}
        districtId={address.districtId}
        streetLine={address.streetLine}
        onLocationChange={(locationId) => onChange({ ...address, locationId, districtId: undefined })}
        onDistrictChange={(districtId) => onChange({ ...address, districtId })}
        onStreetChange={(streetLine) => onChange({ ...address, streetLine })}
      />
    </div>
  );
}

export function CustomerForm({
  locations,
  customerId,
  value,
  onChange,
  purchases,
}: {
  locations: Location[];
  customerId?: number;
  value: CustomerFormValues;
  onChange: (next: CustomerFormValues) => void;
  purchases?: CustomerDetail["purchases"];
}) {
  const { t } = useI18n();
  const [options, setOptions] = useState<Customer[]>([]);

  useEffect(() => {
    api
      .listCustomerOptions(customerId)
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [customerId]);

  function patch(next: Partial<CustomerFormValues>) {
    onChange({ ...value, ...next });
  }

  function updateRelationship(index: number, next: Partial<CustomerRelationshipInput>) {
    const relationships = value.relationships.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...next } : item,
    );
    patch({ relationships });
  }

  return (
    <div className="space-y-4">
      <FormSection title={t("customer.section")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label={t("customer.fullName")}>
            <input
              value={value.fullName}
              onChange={(event) => patch({ fullName: event.target.value })}
              className={fieldClass}
            />
          </FieldLabel>
          <FieldLabel label={t("customer.phone")}>
            <input
              value={value.phone}
              onChange={(event) => patch({ phone: event.target.value })}
              className={fieldClass}
              inputMode="tel"
              autoComplete="tel"
            />
          </FieldLabel>
        </div>
      </FormSection>

      <FormSection title={t("customer.permanentAddress")}>
        <AddressFields
          title=""
          locations={locations}
          address={value.permanentAddress}
          onChange={(permanentAddress) => patch({ permanentAddress })}
        />
      </FormSection>

      <FormSection title={t("customer.temporaryAddress")}>
        <AddressFields
          title=""
          locations={locations}
          address={value.temporaryAddress}
          onChange={(temporaryAddress) => patch({ temporaryAddress })}
        />
      </FormSection>

      <FormSection title={t("customer.notes")}>
        <textarea
          value={value.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          rows={3}
          className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none ring-copper/30 placeholder:text-ink/40 focus:ring-2"
        />
      </FormSection>

      <FormSection
        title={t("customer.relationships")}
        action={
          <button
            type="button"
            onClick={() =>
              patch({
                relationships: [...value.relationships, { relationshipType: "SPOUSE" }],
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-copper hover:bg-copper/10"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("customer.addRelationship")}
          </button>
        }
      >
        {value.relationships.length === 0 ? (
          <p className="text-sm text-ink/50">{t("customer.noRelationships")}</p>
        ) : (
          <div className="space-y-3">
            {value.relationships.map((item, index) => (
              <div
                key={index}
                className="rounded-xl border border-ink/8 bg-white p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <FieldLabel label={t("customer.pickRelated")}>
                      <select
                        value={item.relatedCustomerId ?? ""}
                        onChange={(event) =>
                          updateRelationship(index, { relatedCustomerId: Number(event.target.value) })
                        }
                        className={fieldClass}
                      >
                        <option value="">{t("customer.pickRelated")}</option>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.fullName}
                            {option.phone ? ` · ${option.phone}` : ""}
                          </option>
                        ))}
                      </select>
                    </FieldLabel>
                    <FieldLabel label={t("customer.relationshipType")}>
                      <select
                        value={item.relationshipType ?? "SPOUSE"}
                        onChange={(event) =>
                          updateRelationship(index, {
                            relationshipType: event.target.value as CustomerRelationshipInput["relationshipType"],
                          })
                        }
                        className={fieldClass}
                      >
                        {CUSTOMER_RELATIONSHIP_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {t(`customer.relationship.${type}`)}
                          </option>
                        ))}
                      </select>
                    </FieldLabel>
                    <FieldLabel label={t("customer.relationshipNote")}>
                      <input
                        value={item.note ?? ""}
                        onChange={(event) => updateRelationship(index, { note: event.target.value })}
                        placeholder={t("customer.relationshipNote")}
                        className={`${fieldClass} sm:col-span-2`}
                      />
                    </FieldLabel>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        relationships: value.relationships.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                    className="mt-6 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                    aria-label={t("admin.remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      {purchases && customerId && (
        <FormSection
          title={t("customer.purchaseHistory")}
          action={
            <Link
              href={`/quotes?customerId=${customerId}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-copper hover:bg-copper/10"
            >
              {t("customer.viewQuoteHistory")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {purchases.length === 0 ? (
            <p className="text-sm text-ink/50">{t("customer.noPurchases")}</p>
          ) : (
            <ul className="space-y-2">
              {purchases.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/quotes?customerId=${customerId}&open=${item.id}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-ink/8 bg-white px-4 py-3 transition-colors hover:border-copper/30 hover:bg-copper/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink group-hover:text-copper">{item.vehicleName}</p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {item.brandCode} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className="font-semibold tabular-nums text-copper">{formatVnd(item.onRoadTotal)}</p>
                      <ChevronRight className="h-4 w-4 text-ink/30 group-hover:text-copper" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </FormSection>
      )}
    </div>
  );
}
