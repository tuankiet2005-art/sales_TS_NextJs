import { eq } from "drizzle-orm";

import { getDb, hasDatabaseUrl } from "../db/client";
import { appSettings } from "../db/schema";
import {
  loadDefaultDealerPolicy,
  loadDefaultFeePolicy,
  loadDefaultPlateRegions,
} from "./yaml-defaults";
import type {
  DealerPolicyRecord,
  FeePolicyRecord,
  PlateRegionsRecord,
} from "./types";
import { APP_SETTING_KEYS } from "./types";

type PolicySnapshot = {
  feePolicy: FeePolicyRecord;
  dealerPolicy: DealerPolicyRecord;
  plateRegions: PlateRegionsRecord;
};

let memoryOverrides: Partial<Record<keyof typeof APP_SETTING_KEYS, unknown>> = {};
let cachedSnapshot: PolicySnapshot | null = null;

export function resetPolicyStoreForTests() {
  memoryOverrides = {};
  cachedSnapshot = null;
}

export function setPolicyOverrideForTests(
  key: keyof typeof APP_SETTING_KEYS,
  value: FeePolicyRecord | DealerPolicyRecord | PlateRegionsRecord | null,
) {
  if (value === null) {
    delete memoryOverrides[key];
  } else {
    memoryOverrides[key] = value;
  }
  cachedSnapshot = null;
}

async function readSettingPayload<T>(settingKey: string): Promise<T | null> {
  const testKey = Object.entries(APP_SETTING_KEYS).find(([, value]) => value === settingKey)?.[0];
  if (testKey && testKey in memoryOverrides) {
    return memoryOverrides[testKey as keyof typeof APP_SETTING_KEYS] as T;
  }

  if (!hasDatabaseUrl()) {
    return null;
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.settingKey, settingKey))
    .limit(1);
  if (rows.length === 0) {
    return null;
  }
  return JSON.parse(rows[0].payload) as T;
}

export async function loadPolicySnapshot(): Promise<PolicySnapshot> {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  const [feeOverride, dealerOverride, plateOverride] = await Promise.all([
    readSettingPayload<FeePolicyRecord>(APP_SETTING_KEYS.feePolicy),
    readSettingPayload<DealerPolicyRecord>(APP_SETTING_KEYS.dealerPolicy),
    readSettingPayload<PlateRegionsRecord>(APP_SETTING_KEYS.plateRegions),
  ]);

  cachedSnapshot = {
    feePolicy: feeOverride ?? loadDefaultFeePolicy(),
    dealerPolicy: dealerOverride ?? loadDefaultDealerPolicy(),
    plateRegions: plateOverride ?? loadDefaultPlateRegions(),
  };
  return cachedSnapshot;
}

export async function getFeePolicy(): Promise<FeePolicyRecord> {
  return (await loadPolicySnapshot()).feePolicy;
}

export async function getDealerPolicy(): Promise<DealerPolicyRecord> {
  return (await loadPolicySnapshot()).dealerPolicy;
}

export async function getPlateRegions(): Promise<PlateRegionsRecord> {
  return (await loadPolicySnapshot()).plateRegions;
}

export function invalidatePolicyCache() {
  cachedSnapshot = null;
}
