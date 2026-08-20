import { eq } from "drizzle-orm";

import { saveAppSetting } from "../db/repositories/app-settings";
import {
  getDealerPolicy,
  getFeePolicy,
  getPlateRegions,
  invalidatePolicyCache,
} from "../config/policy-store";
import type {
  AdminDealerPolicy,
  AdminFeePolicy,
  AdminPlateRegions,
} from "@/types";
import { APP_SETTING_KEYS } from "../config/types";

export async function readFeePolicy(): Promise<AdminFeePolicy> {
  return getFeePolicy();
}

export async function saveFeePolicy(record: AdminFeePolicy) {
  await saveAppSetting(APP_SETTING_KEYS.feePolicy, record);
  invalidatePolicyCache();
  return record;
}

export async function readDealerPolicy(): Promise<AdminDealerPolicy> {
  const policy = await getDealerPolicy();
  return {
    privateDiscountPercent: policy.privateDiscountPercent,
    commercialDiscountPercent: policy.commercialDiscountPercent,
    offers: policy.offers.map((offer) => ({
      id: offer.id,
      kind: offer.kind,
      amount: offer.amount ?? undefined,
      percent: offer.percent ?? undefined,
      title: offer.title,
      description: offer.description ?? {},
    })),
  };
}

export async function saveDealerPolicy(record: AdminDealerPolicy) {
  await saveAppSetting(APP_SETTING_KEYS.dealerPolicy, record);
  invalidatePolicyCache();
  return record;
}

export async function readPlateRegions(): Promise<AdminPlateRegions> {
  return getPlateRegions();
}

export async function savePlateRegions(record: AdminPlateRegions) {
  await saveAppSetting(APP_SETTING_KEYS.plateRegions, record);
  invalidatePolicyCache();
  return record;
}
