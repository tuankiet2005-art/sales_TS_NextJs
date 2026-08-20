export type UsageType = "PRIVATE" | "COMMERCIAL";

export type FeeCalculationType =
  | "FIXED"
  | "PERCENT_OF_LIST_PRICE"
  | "PERCENT_WITH_BOUNDS";

export type FeeDefinitionRow = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  mandatory: boolean;
  sortOrder: number;
};

export type FeeRuleRow = {
  id: number;
  feeDefinitionId: number;
  categoryId?: number | null;
  locationId?: number | null;
  feeZone?: string | null;
  calculationType: FeeCalculationType;
  fixedAmount?: string | number | null;
  percentage?: string | number | null;
  minAmount?: string | number | null;
  maxAmount?: string | number | null;
  minEngineCc?: number | null;
  maxEngineCc?: number | null;
  minPrice?: string | number | null;
  maxPrice?: string | number | null;
  priority: number;
};

export type VehicleRow = {
  id: number;
  listPrice: string | number;
  taxBasePrice?: string | number | null;
  engineCc?: number | null;
  defaultDeposit?: string | number | null;
  registrationServiceFee?: string | number | null;
  micaPlateFee?: string | number | null;
  inspectionFee?: string | number | null;
  name: string;
  model: string;
  brandName: string;
  categoryId: number;
  categoryName: string;
};

export type LocationRow = {
  id: number;
  code: string;
  name: string;
  feeZone?: string | null;
};

export type AccessoryItem = {
  name: string;
  amount: number;
};

export type CalculateOnRoadInput = {
  vehicle: VehicleRow;
  location: LocationRow;
  categoryId?: number | null;
  includeOptionalInsurance: boolean;
  discountAmount?: number | null;
  salePrice?: number | null;
  deposit?: number | null;
  optionalBodyInsurance?: number | null;
  registrationServiceFee?: number | null;
  micaPlateFee?: number | null;
  inspectionFee?: number | null;
  accessories?: AccessoryItem[] | null;
  usageType?: string | null;
  selectedOfferIds?: string[] | null;
  forgoneOfferIds?: string[] | null;
};

export type FeeLine = {
  code: string;
  name: string;
  description?: string | null;
  mandatory: boolean;
  applicable: boolean;
  includedInTotal: boolean;
  amount: number;
  note: string;
};

export type OnRoadCostResult = {
  vehicleId: number;
  vehicleName: string;
  brandName: string;
  model: string;
  categoryName: string;
  locationId: number;
  locationName: string;
  listPrice: number;
  discountAmount: number;
  salePrice: number;
  fees: FeeLine[];
  totalMandatory: number;
  totalOptional: number;
  accessoriesTotal: number;
  estimatedTotal: number;
  deposit: number;
  accessories: AccessoryItem[];
  currency: string;
  usageType: UsageType;
  discountPercent: number;
  appliedOfferIds: string[];
};
