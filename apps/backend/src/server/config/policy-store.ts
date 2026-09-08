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
let loadingSnapshot: Promise<PolicySnapshot> | null = null;
let loadGeneration = 0;

export function resetPolicyStoreForTests() {
  memoryOverrides = {};
  cachedSnapshot = null;
  loadingSnapshot = null;
  loadGeneration = 0;
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
  loadingSnapshot = null;
  loadGeneration += 1;
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

async function fetchPolicySnapshot(): Promise<PolicySnapshot> {
  const [feeOverride, dealerOverride, plateOverride] = await Promise.all([
    readSettingPayload<FeePolicyRecord>(APP_SETTING_KEYS.feePolicy),
    readSettingPayload<DealerPolicyRecord>(APP_SETTING_KEYS.dealerPolicy),
    readSettingPayload<PlateRegionsRecord>(APP_SETTING_KEYS.plateRegions),
  ]);

  return {
    feePolicy: feeOverride ?? loadDefaultFeePolicy(),
    dealerPolicy: dealerOverride ?? loadDefaultDealerPolicy(),
    plateRegions: plateOverride ?? loadDefaultPlateRegions(),
  };
}

export async function loadPolicySnapshot(): Promise<PolicySnapshot> {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }
  if (!loadingSnapshot) {
    const generation = loadGeneration;
    loadingSnapshot = fetchPolicySnapshot()
      .then((snapshot) => {
        if (generation === loadGeneration) {
          cachedSnapshot = snapshot;
        }
        return snapshot;
      })
      .catch((error) => {
        if (generation === loadGeneration) {
          loadingSnapshot = null;
        }
        throw error;
      });
  }
  return loadingSnapshot;
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
  loadingSnapshot = null;
  loadGeneration += 1;
}
