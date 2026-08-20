import type { DealerPolicyRecord } from "../config/types";
import { percentOf, toNumber } from "./money";
import type { UsageType } from "./types";

export const FORGO_FOR_CREDIT = "FORGO_FOR_CREDIT";
export const EXTRA_PERCENT = "EXTRA_PERCENT";
export const PRICE_CREDIT = "PRICE_CREDIT";

export type QuotePricing = {
  listPrice: number;
  discountPercent: number;
  discountAmount: number;
  salePrice: number;
  appliedOfferIds: string[];
};

export function parseUsageType(value: string | null | undefined): UsageType {
  return value?.toUpperCase() === "COMMERCIAL" ? "COMMERCIAL" : "PRIVATE";
}

export function discountPercent(policy: DealerPolicyRecord, usage: UsageType): number {
  return usage === "COMMERCIAL"
    ? policy.commercialDiscountPercent
    : policy.privateDiscountPercent;
}

export function priceVehicle(
  policy: DealerPolicyRecord,
  listPrice: number,
  usage: UsageType,
  selectedOfferIds: string[] | null | undefined,
  forgoneOfferIds: string[] | null | undefined,
  overrideDiscount: number | null | undefined,
): QuotePricing {
  const list = listPrice || 0;
  const percent = discountPercent(policy, usage);
  const baseDiscount =
    overrideDiscount != null ? overrideDiscount : percentOf(list, percent);
  const selected = new Set(selectedOfferIds ?? []);
  const forgone = new Set(forgoneOfferIds ?? []);

  let extraPercent = 0;
  let policyCredit = 0;
  const applied: string[] = [];

  for (const offer of policy.offers) {
    if (!offer.id) {
      continue;
    }
    const kind = offer.kind ?? "";
    if (kind === FORGO_FOR_CREDIT && forgone.has(offer.id)) {
      policyCredit += toNumber(offer.amount);
      applied.push(offer.id);
    } else if (kind === PRICE_CREDIT && selected.has(offer.id)) {
      policyCredit += toNumber(offer.amount);
      applied.push(offer.id);
    } else if (kind === EXTRA_PERCENT && selected.has(offer.id)) {
      extraPercent += toNumber(offer.percent);
      applied.push(offer.id);
    }
  }

  const extraDiscount = percentOf(list, extraPercent);
  let totalDiscount = baseDiscount + extraDiscount + policyCredit;
  if (totalDiscount > list) {
    totalDiscount = list;
  }

  return {
    listPrice: list,
    discountPercent: percent,
    discountAmount: totalDiscount,
    salePrice: list - totalDiscount,
    appliedOfferIds: applied,
  };
}
