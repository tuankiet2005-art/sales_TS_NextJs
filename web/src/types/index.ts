import type { CustomerRelationshipType } from "../lib/customerRelationships";
import type { StructuredAddress } from "../lib/customerAddress";
import type { RelationshipDiscountOffer } from "../lib/customerRelationshipDiscount";

export type OperatorRole = "admin" | "sales";

export interface Brand {
  id: number;
  code: string;
  name: string;
  tagline: string;
  market: string;
  accentColor: string;
  imageUrl: string;
  ready: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  id: number;
  code: string;
  name: string;
  description: string;
  typicalSeats: number | null;
  requiresInspection: boolean;
  requiresRoadUseFee: boolean;
  requiresCompulsoryInsurance: boolean;
}

export interface Location {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
  region: string;
  feeZone: string;
  centrallyGovernedCity: boolean;
}

export interface LocationDistrict {
  id: number;
  locationId: number;
  code: string;
  name: string;
  nameEn: string;
  nameZh: string;
  nameJa: string;
}

export interface VehicleSummary {
  id: number;
  brand: string;
  brandCode: string;
  model: string;
  name: string;
  year: number;
  seats: number | null;
  vehicleType: string;
  listPrice: number;
  discountAmount?: number;
  salePrice?: number;
  imageUrl: string;
  category: Category;
}

export interface VehicleModelContext {
  model: string;
  year: number;
  availableYears: number[];
  trimsForYear: VehicleSummary[];
}

export interface VehicleModelSummary {
  brand: string;
  brandCode: string;
  model: string;
  yearMin: number | null;
  yearMax: number | null;
  minListPrice: number;
  minSalePrice?: number;
  imageUrl: string;
  category: Category;
  trimCount: number;
}

export interface VehicleModelDetail {
  brand: string;
  brandCode: string;
  model: string;
  years: number[];
  defaultYear: number;
  trimsByYear: Record<string, VehicleDetail[]>;
}

export interface VehicleDetail extends VehicleSummary {
  modelContext?: VehicleModelContext;
  engineCc: number | null;
  fuelType: string;
  transmission: string;
  defaultDeposit?: number;
  registrationServiceFee?: number;
  micaPlateFee?: number;
  inspectionFee?: number;
  defaultColor?: string;
  availableColors?: string;
  colorPhotos?: Record<string, string[]>;
  deliveryNote?: string;
  warrantyNote?: string;
  gifts?: string;
  specifications: Record<string, string>;
}

export interface FeeLine {
  code: string;
  name: string;
  description: string;
  mandatory: boolean;
  applicable: boolean;
  includedInTotal: boolean;
  amount: number;
  calculationNote: string;
}

export interface AccessoryItem {
  name: string;
  amount: number;
  catalogId?: string;
  imageUrl?: string;
}

export type UsageType = "PRIVATE" | "COMMERCIAL";

export interface DealerOffer {
  id: string;
  kind: string;
  amount?: number;
  percent?: number;
  title: Record<string, string>;
  description: Record<string, string>;
}

export interface DealerPolicy {
  privateDiscountPercent: number;
  commercialDiscountPercent: number;
  offers: DealerOffer[];
}

export interface QuoteBankLoan {
  bankId?: number;
  bankName?: string;
  monthlyInterestRate?: number;
  loanTermYears?: number;
  fixedRatePeriodYears?: number;
  consultingEmployeeId?: number;
  consultingEmployeeName?: string;
  consultingEmployeePhone?: string;
}

export interface QuoteExtras {
  listPrice?: number;
  discountAmount?: number;
  basePolicyDiscountAmount?: number;
  relationshipDiscount?: RelationshipDiscountOffer;
  deposit?: number;
  bankLoan?: QuoteBankLoan;
  registrationTax?: number;
  licensePlateFee?: number;
  registrationServiceFee?: number;
  inspectionFee?: number;
  roadUseFee?: number;
  compulsoryInsurance?: number;
  optionalBodyInsurance?: number;
  micaPlateFee?: number;
  accessories: AccessoryItem[];
}

export interface Customer {
  id: number;
  fullName: string;
  phone?: string;
  permanentAddress: StructuredAddress;
  temporaryAddress: StructuredAddress;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type { StructuredAddress, CustomerAddressKind, CustomerFieldValues } from "../lib/customerAddress";

export interface CustomerRelationshipInput {
  relatedCustomerId?: number;
  relationshipType?: CustomerRelationshipType;
  note?: string;
}

export interface CustomerRelationship {
  id: number;
  relationshipType: CustomerRelationshipType;
  note?: string;
  relatedCustomer: {
    id: number;
    fullName: string;
    phone?: string;
  };
}

export interface CustomerPurchase {
  id: number;
  vehicleName: string;
  brandCode: string;
  onRoadTotal: number;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  relationships: CustomerRelationship[];
  purchases: CustomerPurchase[];
}

export interface QuoteHistory {
  id: number;
  customerId?: number;
  customerName: string;
  customerAddress?: string;
  vehicleId: number;
  brandCode: string;
  vehicleName: string;
  locationId: number;
  locationName: string;
  categoryId?: number;
  color?: string;
  usageType?: UsageType;
  language?: string;
  includeOptional: boolean;
  listPrice?: number;
  salePrice?: number;
  discountAmount?: number;
  deposit?: number;
  onRoadTotal: number;
  payload?: string;
  createdAt: string;
}

export interface CostBreakdown {
  vehicleId: number;
  vehicleName: string;
  brand: string;
  model: string;
  categoryName: string;
  locationId: number;
  locationName: string;
  listPrice: number;
  discountAmount?: number;
  salePrice?: number;
  fees: FeeLine[];
  totalMandatoryFees: number;
  totalOptionalFees: number;
  accessoriesTotal?: number;
  estimatedOnRoadTotal: number;
  deposit?: number;
  accessories?: AccessoryItem[];
  currency: string;
  usageType?: UsageType;
  discountPercent?: number;
  appliedOfferIds?: string[];
}

export interface AdminBrand {
  id?: number;
  code: string;
  name: string;
  tagline?: string;
  market?: string;
  accentColor?: string;
  imageUrl?: string;
  ready?: boolean;
  sortOrder?: number;
}

export interface AdminCategory {
  id?: number;
  code: string;
  name: string;
  description?: string;
  typicalSeats?: number | null;
  requiresInspection?: boolean;
  requiresRoadUseFee?: boolean;
  requiresCompulsoryInsurance?: boolean;
  sortOrder?: number;
}

export interface AdminLocation {
  id?: number;
  code: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  region: string;
  feeZone: string;
  centrallyGovernedCity?: boolean;
}

export interface AdminDealer {
  id?: number;
  brandCode: string;
  name: string;
  address?: string;
  market?: string;
  active?: boolean;
}

export interface AccessoryCatalogItem {
  id: number;
  code: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  amount: number;
  imageUrl?: string;
}

export interface AdminAccessory {
  id?: number;
  code?: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  amount: number;
  imageUrl?: string;
  active?: boolean;
  sortOrder?: number;
}

export interface AdminBank {
  id?: number;
  code: string;
  name: string;
  active?: boolean;
  sortOrder?: number;
}

export interface AdminConsultingEmployee {
  id?: number;
  code: string;
  name: string;
  phone?: string;
  active?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface AdminBankLoan {
  id?: number;
  bankId: number;
  bankName?: string;
  monthlyInterestRate: number;
  loanTermYears: number;
  fixedRatePeriodYears: number;
  consultingEmployeeId: number;
  consultingEmployeeName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bank {
  id: number;
  code: string;
  name: string;
}

export interface ConsultingEmployee {
  id: number;
  code: string;
  name: string;
  phone?: string;
  isDefault?: boolean;
}

export interface AdminFeeDefinition {
  id?: number;
  code: string;
  name: string;
  description?: string;
  mandatory?: boolean;
  sortOrder?: number;
  active?: boolean;
}

export interface AdminVehicle {
  id?: number;
  brandCode: string;
  categoryCode: string;
  model: string;
  name: string;
  seats?: number | null;
  vehicleType?: string;
  year?: number | null;
  engineCc?: number | null;
  fuelType?: string;
  transmission?: string;
  listPrice: number;
  discountAmount?: number | null;
  salePrice?: number | null;
  taxBasePrice?: number | null;
  defaultDeposit?: number | null;
  registrationServiceFee?: number | null;
  micaPlateFee?: number | null;
  inspectionFee?: number | null;
  defaultColor?: string;
  availableColors?: string;
  colorPhotos?: Record<string, string[]>;
  deliveryNote?: string;
  warrantyNote?: string;
  gifts?: string;
  quoteSheetName?: string;
  imageUrl?: string;
  specifications?: Record<string, string>;
  active?: boolean;
}

export interface AdminFeeRule {
  id?: number;
  feeDefinitionCode: string;
  categoryCode?: string | null;
  locationCode?: string | null;
  feeZone?: string | null;
  calculationType: string;
  fixedAmount?: number | null;
  percentage?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  minEngineCc?: number | null;
  maxEngineCc?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  priority?: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  active?: boolean;
}

export interface CatalogSnapshot {
  brands?: AdminBrand[];
  categories?: AdminCategory[];
  locations?: AdminLocation[];
  dealers?: AdminDealer[];
  feeDefinitions?: AdminFeeDefinition[];
  vehicles?: AdminVehicle[];
  feeRules?: AdminFeeRule[];
}

export interface ImportResult {
  brands: number;
  categories: number;
  locations: number;
  dealers: number;
  feeDefinitions: number;
  vehicles: number;
  feeRules: number;
}

export interface AdminFeePolicy {
  registrationTaxPercent: number;
  registrationTaxCommercialPercent: number;
}

export interface AdminDealerPolicy {
  privateDiscountPercent: number;
  commercialDiscountPercent: number;
  offers: DealerOffer[];
}

export interface AdminPlateUnit {
  code?: string;
  name: string;
  area: string;
}

export interface AdminPlateRegions {
  defaultArea: string;
  areas: Record<string, { amount: number }>;
  regions: Record<string, AdminPlateUnit[]>;
}
