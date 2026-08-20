import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

import type {
  DealerPolicyRecord,
  FeePolicyRecord,
  PlateRegionsRecord,
} from "./types";

const DATA_DIR = join(process.cwd(), "src/server/config/data");

function readYamlFile<T>(filename: string): T {
  const raw = readFileSync(join(DATA_DIR, filename), "utf8");
  return parse(raw) as T;
}

type FeePolicyYaml = {
  "fee-policy": {
    "registration-tax-percent": number;
    "registration-tax-commercial-percent": number;
  };
};

type DealerPolicyYaml = {
  "dealer-policy": {
    discount: {
      "private-percent": number;
      "commercial-percent": number;
    };
    offers: Array<{
      id: string;
      kind: string;
      amount?: number;
      percent?: number;
      title: Record<string, string>;
      description?: Record<string, string>;
    }>;
  };
};

type PlateRegionsYaml = {
  "license-plate-regions": {
    "default-area": string;
    areas: Record<string, { amount: number }>;
    regions: Record<string, Array<{ code: string; name: string; area: string }>>;
  };
};

export function loadDefaultFeePolicy(): FeePolicyRecord {
  const doc = readYamlFile<FeePolicyYaml>("fee-policy.yml");
  return {
    registrationTaxPercent: doc["fee-policy"]["registration-tax-percent"],
    registrationTaxCommercialPercent: doc["fee-policy"]["registration-tax-commercial-percent"],
  };
}

export function loadDefaultDealerPolicy(): DealerPolicyRecord {
  const doc = readYamlFile<DealerPolicyYaml>("dealer-policy.yml");
  const policy = doc["dealer-policy"];
  return {
    privateDiscountPercent: policy.discount["private-percent"],
    commercialDiscountPercent: policy.discount["commercial-percent"],
    offers: (policy.offers ?? []).map((offer) => ({
      id: offer.id,
      kind: offer.kind,
      amount: offer.amount ?? null,
      percent: offer.percent ?? null,
      title: offer.title,
      description: offer.description,
    })),
  };
}

export function loadDefaultPlateRegions(): PlateRegionsRecord {
  const doc = readYamlFile<PlateRegionsYaml>("license-plate-regions.yml");
  const policy = doc["license-plate-regions"];
  const areas: PlateRegionsRecord["areas"] = {};
  for (const [code, value] of Object.entries(policy.areas ?? {})) {
    areas[code] = { amount: value.amount };
  }
  const regions: PlateRegionsRecord["regions"] = {};
  for (const [region, units] of Object.entries(policy.regions ?? {})) {
    regions[region] = units.map((unit) => ({
      code: unit.code,
      name: unit.name,
      area: unit.area,
    }));
  }
  return {
    defaultArea: policy["default-area"],
    areas,
    regions,
  };
}
