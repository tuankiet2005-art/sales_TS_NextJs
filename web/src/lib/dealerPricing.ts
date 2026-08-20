import type { DealerPolicy, UsageType } from "../types";

const FORGO_FOR_CREDIT = "FORGO_FOR_CREDIT";
const EXTRA_PERCENT = "EXTRA_PERCENT";
const PRICE_CREDIT = "PRICE_CREDIT";

function percentOf(price: number, percentage: number): number {
  return Math.round((price * percentage) / 100);
}

function discountPercent(policy: DealerPolicy, usage: UsageType): number {
  return usage === "COMMERCIAL" ? policy.commercialDiscountPercent : policy.privateDiscountPercent;
}

/** Client-side mirror of server `priceVehicle` for catalog and confirm-page display. */
export function priceVehicleFromPolicy(
  policy: DealerPolicy,
  listPrice: number,
  usage: UsageType,
  selectedOfferIds: string[],
  forgoneOfferIds: string[],
): { discountAmount: number; salePrice: number } {
  const list = listPrice || 0;
  const percent = discountPercent(policy, usage);
  const baseDiscount = percentOf(list, percent);
  const selected = new Set(selectedOfferIds);
  const forgone = new Set(forgoneOfferIds);

  let extraPercent = 0;
  let policyCredit = 0;

  for (const offer of policy.offers) {
    const kind = offer.kind ?? "";
    if (kind === FORGO_FOR_CREDIT && forgone.has(offer.id)) {
      policyCredit += offer.amount ?? 0;
    } else if (kind === PRICE_CREDIT && selected.has(offer.id)) {
      policyCredit += offer.amount ?? 0;
    } else if (kind === EXTRA_PERCENT && selected.has(offer.id)) {
      extraPercent += offer.percent ?? 0;
    }
  }

  const extraDiscount = percentOf(list, extraPercent);
  let totalDiscount = baseDiscount + extraDiscount + policyCredit;
  if (totalDiscount > list) {
    totalDiscount = list;
  }

  return {
    discountAmount: totalDiscount,
    salePrice: list - totalDiscount,
  };
}
