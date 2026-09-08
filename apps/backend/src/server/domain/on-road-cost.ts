import {
  describePolicyFee,
  isPolicyOwnedFee,
  policyFeeAmount,
} from "../config/fee-policy";
import type { DealerPolicyRecord, FeePolicyRecord, PlateRegionsRecord } from "../config/types";
import { calculateFeeAmount, describeFeeRule } from "./fee-amount-calculator";
import { parseUsageType, priceVehicle } from "./dealer-policy";
import { resolveFeeRule } from "./fee-rule-resolver";
import { toNumber } from "./money";
import type {
  AccessoryItem,
  CalculateOnRoadInput,
  FeeDefinitionRow,
  FeeLine,
  FeeRuleRow,
  OnRoadCostResult,
  UsageType,
} from "./types";

const CURRENCY = "VND";

export type OnRoadCostContext = {
  feePolicy: FeePolicyRecord;
  plateRegions: PlateRegionsRecord;
  dealerPolicy: DealerPolicyRecord;
  feeDefinitions: FeeDefinitionRow[];
  activeFeeRules: FeeRuleRow[];
  selectedCategoryId: number;
  selectedCategoryName: string;
};

export function calculateOnRoadCost(
  input: CalculateOnRoadInput,
  context: OnRoadCostContext,
): OnRoadCostResult {
  const usage = parseUsageType(input.usageType);
  const pricing = priceVehicle(
    context.dealerPolicy,
    toNumber(input.vehicle.listPrice),
    usage,
    input.selectedOfferIds,
    input.forgoneOfferIds,
    input.discountAmount,
  );

  const salePrice =
    input.salePrice != null
      ? input.salePrice
      : pricing.salePrice;
  const discount =
    input.salePrice != null
      ? Math.max(0, toNumber(input.vehicle.listPrice) - input.salePrice)
      : pricing.discountAmount;

  const fees: FeeLine[] = [];
  let totalMandatory = 0;
  let totalOptional = 0;

  for (const definition of context.feeDefinitions) {
    const matched = resolveFeeRule(
      definition,
      input.vehicle,
      context.selectedCategoryId,
      input.location,
      context.activeFeeRules,
    );
    const override = overrideAmount(input.vehicle, definition.code, input);

    if (!matched && override == null && !isPolicyOwnedFee(definition.code)) {
      continue;
    }

    let amount: number;
    let note: string;
    if (override != null) {
      amount = override;
      note = "Entered on quote";
    } else if (isPolicyOwnedFee(definition.code)) {
      amount = policyFeeAmount(
        definition.code,
        salePrice,
        usage,
        input.location,
        context.feePolicy,
        context.plateRegions,
      );
      note = describePolicyFee(
        definition.code,
        usage,
        input.location,
        context.feePolicy,
        context.plateRegions,
      );
    } else {
      amount = calculateFeeAmount(matched!, input.vehicle);
      note = describeFeeRule(matched!);
    }

    const includeInTotal =
      definition.mandatory ||
      input.includeOptionalInsurance ||
      (definition.code === "OPTIONAL_BODY_INSURANCE" &&
        override != null &&
        amount > 0);

    if (definition.mandatory) {
      totalMandatory += amount;
    } else if (includeInTotal) {
      totalOptional += amount;
    }

    fees.push({
      code: definition.code,
      name: definition.name,
      description: definition.description ?? null,
      mandatory: definition.mandatory,
      applicable: true,
      includedInTotal: includeInTotal,
      amount,
      note,
    });
  }

  const accessories = sanitizeAccessories(input.accessories);
  const accessoriesTotal = accessories.reduce((sum, item) => sum + item.amount, 0);
  const estimatedTotal = salePrice + totalMandatory + totalOptional + accessoriesTotal;
  const deposit =
    input.deposit != null
      ? input.deposit
      : toNumber(input.vehicle.defaultDeposit);

  return {
    vehicleId: input.vehicle.id,
    vehicleName: input.vehicle.name,
    brandName: input.vehicle.brandName,
    model: input.vehicle.model,
    categoryName: context.selectedCategoryName,
    locationId: input.location.id,
    locationName: input.location.name,
    listPrice: toNumber(input.vehicle.listPrice),
    discountAmount: discount,
    salePrice,
    fees,
    totalMandatory,
    totalOptional,
    accessoriesTotal,
    estimatedTotal,
    deposit,
    accessories,
    currency: CURRENCY,
    usageType: usage,
    discountPercent: pricing.discountPercent,
    appliedOfferIds: pricing.appliedOfferIds,
  };
}

function overrideAmount(
  vehicle: CalculateOnRoadInput["vehicle"],
  feeCode: string,
  request: CalculateOnRoadInput,
): number | null {
  switch (feeCode) {
    case "REGISTRATION_TAX":
      return request.registrationTax ?? null;
    case "LICENSE_PLATE":
      return request.licensePlateFee ?? null;
    case "REGISTRATION_FEE":
    case "REGISTRATION_SERVICE":
      return firstPresent(
        request.registrationServiceFee,
        vehicle.registrationServiceFee,
      );
    case "MICA_PLATE":
      return firstPresent(request.micaPlateFee, vehicle.micaPlateFee);
    case "INSPECTION":
      return firstPresent(request.inspectionFee, vehicle.inspectionFee);
    case "ROAD_USE":
      return request.roadUseFee ?? null;
    case "COMPULSORY_INSURANCE":
      return request.compulsoryInsurance ?? null;
    case "OPTIONAL_BODY_INSURANCE":
      return request.optionalBodyInsurance ?? null;
    default:
      return null;
  }
}

function firstPresent(
  requestValue: number | null | undefined,
  vehicleValue: string | number | null | undefined,
): number | null {
  if (requestValue != null) {
    return requestValue;
  }
  if (vehicleValue != null) {
    return toNumber(vehicleValue);
  }
  return null;
}

function sanitizeAccessories(accessories: AccessoryItem[] | null | undefined): AccessoryItem[] {
  if (!accessories) {
    return [];
  }
  return accessories
    .filter(
      (item) =>
        item &&
        item.name?.trim() &&
        item.amount != null &&
        item.amount > 0,
    )
    .map((item) => ({
      name: item.name.trim(),
      amount: item.amount,
    }));
}

export type { OnRoadCostResult } from "./types";
