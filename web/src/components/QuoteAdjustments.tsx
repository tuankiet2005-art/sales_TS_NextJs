"use client";
import { Check, CircleDollarSign, Package, Plus, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { accessoryImageUrl } from "../lib/accessoryImageUrl";
import { accessoryLabel } from "../lib/labels";
import { useI18n } from "../i18n/LanguageContext";
import { CurrencyInput } from "./CurrencyInput";
import { formatVnd } from "../lib/format";
import type { AccessoryCatalogItem, QuoteExtras } from "../types";

export function QuoteAdjustments({
  extras,
  onChange,
}: {
  extras: QuoteExtras;
  onChange: (next: QuoteExtras) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 md:*:min-w-0">
      <QuotePricePanel extras={extras} onChange={onChange} />
      <QuoteAccessoriesPanel extras={extras} onChange={onChange} />
    </div>
  );
}

function PanelHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mist text-copper">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex h-8 items-center text-sm font-semibold leading-none">{title}</span>
    </div>
  );
}

export function QuotePricePanel({
  extras,
  onChange,
  action,
}: {
  extras: QuoteExtras;
  onChange: (next: QuoteExtras) => void;
  action?: ReactNode;
}) {
  const { t } = useI18n();

  function setField(field: keyof Omit<QuoteExtras, "accessories">, value: string) {
    onChange({
      ...extras,
      [field]: value === "" ? undefined : Number(value),
    });
  }

  return (
    <section className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card">
      <PanelHeader icon={CircleDollarSign} title={t("adjustablePrices")} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MoneyField label={t("listPrice")} value={extras.listPrice} onChange={(value) => setField("listPrice", value)} />
        <MoneyField label={t("discount")} value={extras.discountAmount} onChange={(value) => setField("discountAmount", value)} />
        {extras.relationshipDiscount ? (
          <p className="col-span-2 rounded-xl bg-forest/8 px-3 py-2.5 text-xs text-forest">
            {t("customer.relationshipDiscountApplied", {
              percent: extras.relationshipDiscount.discountPercent,
              name: extras.relationshipDiscount.relatedCustomerName,
              amount: formatVnd(extras.relationshipDiscount.discountAmount),
              relationship: t(`customer.relationship.${extras.relationshipDiscount.relationshipType}`),
            })}
          </p>
        ) : null}
        <MoneyField label={t("deposit")} value={extras.deposit} onChange={(value) => setField("deposit", value)} />
        <MoneyField
          label={t("adjustableFee.registrationTax")}
          value={extras.registrationTax}
          onChange={(value) => setField("registrationTax", value)}
        />
        <MoneyField
          label={t("adjustableFee.licensePlate")}
          value={extras.licensePlateFee}
          onChange={(value) => setField("licensePlateFee", value)}
        />
        <MoneyField
          label={t("adjustableFee.registration")}
          value={extras.registrationServiceFee}
          onChange={(value) => setField("registrationServiceFee", value)}
        />
        <MoneyField
          label={t("adjustableFee.inspection")}
          value={extras.inspectionFee}
          onChange={(value) => setField("inspectionFee", value)}
        />
        <MoneyField
          label={t("adjustableFee.roadUse")}
          value={extras.roadUseFee}
          onChange={(value) => setField("roadUseFee", value)}
        />
        <MoneyField
          label={t("adjustableFee.compulsoryInsurance")}
          value={extras.compulsoryInsurance}
          onChange={(value) => setField("compulsoryInsurance", value)}
        />
        <MoneyField
          label={t("adjustableFee.bodyInsurance")}
          value={extras.optionalBodyInsurance}
          onChange={(value) => setField("optionalBodyInsurance", value)}
        />
      </div>
      {action}
    </section>
  );
}

function legacyAccessoryImage(code: string): string {
  return `/accessories/${code}.jpg`;
}

export function QuoteAccessoriesPanel({
  extras,
  onChange,
}: {
  extras: QuoteExtras;
  onChange: (next: QuoteExtras) => void;
}) {
  const { t, lang } = useI18n();
  const [catalog, setCatalog] = useState<AccessoryCatalogItem[]>([]);

  useEffect(() => {
    void api.getAccessories().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  function isSelected(catalogCode: string) {
    return extras.accessories.some((item) => item.catalogId === catalogCode);
  }

  function catalogImage(item: AccessoryCatalogItem): string {
    const stored = accessoryImageUrl(item.imageUrl);
    return stored || legacyAccessoryImage(item.code);
  }

  function toggleCatalogItem(catalogCode: string) {
    const catalogItem = catalog.find((item) => item.code === catalogCode);
    if (!catalogItem) {
      return;
    }
    if (isSelected(catalogCode)) {
      onChange({
        ...extras,
        accessories: extras.accessories.filter((item) => item.catalogId !== catalogCode),
      });
      return;
    }
    onChange({
      ...extras,
      accessories: [
        ...extras.accessories,
        {
          name: accessoryLabel(catalogItem, lang),
          amount: catalogItem.amount,
          catalogId: catalogItem.code,
          imageUrl: catalogImage(catalogItem),
        },
      ],
    });
  }

  return (
    <section className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card">
      <PanelHeader icon={Package} title={t("accessoriesTitle")} />

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
        {catalog.map((item) => {
          const selected = isSelected(item.code);
          const label = accessoryLabel(item, lang);
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => toggleCatalogItem(item.code)}
              className={`overflow-hidden rounded-xl border text-left ${
                selected ? "border-copper ring-1 ring-copper/30" : "border-ink/10 bg-white"
              }`}
            >
              <div className="relative">
                <img src={catalogImage(item)} alt={label} className="aspect-[16/10] w-full object-cover" />
                {selected && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-copper text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="px-1.5 py-1.5">
                <p className="line-clamp-2 text-[11px] font-semibold leading-4">{label}</p>
                <p className="mt-0.5 text-[11px] text-copper">{formatVnd(item.amount)}</p>
              </div>
            </button>
          );
        })}
      </div>

      {extras.accessories.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-ink/8 pt-3">
          {extras.accessories.map((item, index) => (
            <div
              key={`${item.catalogId ?? item.name}-${index}`}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_7.5rem_auto]"
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-12 w-14 rounded-xl object-cover" />
              ) : (
                <div className="h-12 w-14 rounded-xl bg-mist" />
              )}
              <input
                value={item.name}
                onChange={(event) => {
                  const accessories = extras.accessories.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, name: event.target.value } : row
                  );
                  onChange({ ...extras, accessories });
                }}
                placeholder={t("accessoryName")}
                className="h-12 min-w-0 rounded-xl border border-ink/10 bg-paper px-3 text-base"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...extras,
                    accessories: extras.accessories.filter((_, rowIndex) => rowIndex !== index),
                  })
                }
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-ink/10 text-ink/60 hover:bg-mist hover:text-red-700 sm:col-start-4 sm:row-start-1"
                aria-label={t("removeAccessory")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <CurrencyInput
                value={item.amount || undefined}
                onChange={(next) => {
                  const accessories = extras.accessories.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, amount: next ?? 0 } : row
                  );
                  onChange({ ...extras, accessories });
                }}
                placeholder={t("amount")}
                className="col-span-3 h-12 w-full rounded-xl border border-ink/10 bg-paper px-3 text-base sm:col-span-1 sm:col-start-3 sm:row-start-1"
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange({ ...extras, accessories: [...extras.accessories, { name: "", amount: 0 }] })}
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-ink/20 px-2.5 text-xs font-semibold text-ink hover:bg-mist"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("addAccessory")}
      </button>
    </section>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="font-medium text-ink/80">{label}</span>
      <CurrencyInput
        value={value}
        onChange={(next) => onChange(next == null ? "" : String(next))}
        className="mt-1.5 h-12 w-full rounded-xl border border-ink/10 bg-paper px-3 text-base"
      />
    </label>
  );
}
