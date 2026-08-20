export type LocalizedText = Record<string, string>;

export type FeePolicyRecord = {
  registrationTaxPercent: number;
  registrationTaxCommercialPercent: number;
};

export type DealerOfferRecord = {
  id: string;
  kind: string;
  amount?: number | null;
  percent?: number | null;
  title: LocalizedText;
  description?: LocalizedText;
};

export type DealerPolicyRecord = {
  privateDiscountPercent: number;
  commercialDiscountPercent: number;
  offers: DealerOfferRecord[];
};

export type PlateAreaRecord = {
  amount: number;
};

export type PlateUnitRecord = {
  code: string;
  name: string;
  area: string;
};

export type PlateRegionsRecord = {
  defaultArea: string;
  areas: Record<string, PlateAreaRecord>;
  regions: Record<string, PlateUnitRecord[]>;
};

export const APP_SETTING_KEYS = {
  feePolicy: "fee-policy",
  dealerPolicy: "dealer-policy",
  plateRegions: "license-plate-regions",
} as const;
