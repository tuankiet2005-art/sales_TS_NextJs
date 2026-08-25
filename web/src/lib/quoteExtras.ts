import type { CostBreakdown, QuoteExtras, VehicleDetail } from "../types";

export function extrasStorageKey(vehicleId: number): string {
  return `onroad-extras-${vehicleId}`;
}

function feeFromBreakdown(breakdown: CostBreakdown, code: string): number | undefined {
  const line = breakdown.fees?.find((fee) => fee.code === code);
  return line?.amount;
}

function registrationServiceFromBreakdown(breakdown: CostBreakdown): number | undefined {
  return (
    feeFromBreakdown(breakdown, "REGISTRATION_SERVICE") ??
    feeFromBreakdown(breakdown, "REGISTRATION_FEE")
  );
}

export function extrasFromVehicle(vehicle: VehicleDetail): QuoteExtras {
  return {
    listPrice: vehicle.listPrice,
    discountAmount: vehicle.discountAmount,
    deposit: vehicle.defaultDeposit,
    registrationServiceFee: vehicle.registrationServiceFee,
    micaPlateFee: vehicle.micaPlateFee,
    inspectionFee: vehicle.inspectionFee,
    accessories: [],
  };
}

/** Seed adjustable quote fields from the server breakdown (includes usage + offers). */
export function extrasFromQuote(vehicle: VehicleDetail, breakdown: CostBreakdown): QuoteExtras {
  const discountAmount = breakdown.discountAmount ?? vehicle.discountAmount;
  return {
    ...extrasFromVehicle(vehicle),
    listPrice: breakdown.listPrice ?? vehicle.listPrice,
    discountAmount,
    basePolicyDiscountAmount: discountAmount,
    registrationTax: feeFromBreakdown(breakdown, "REGISTRATION_TAX"),
    licensePlateFee: feeFromBreakdown(breakdown, "LICENSE_PLATE"),
    registrationServiceFee:
      registrationServiceFromBreakdown(breakdown) ?? vehicle.registrationServiceFee,
    inspectionFee: feeFromBreakdown(breakdown, "INSPECTION") ?? vehicle.inspectionFee,
    roadUseFee: feeFromBreakdown(breakdown, "ROAD_USE"),
    compulsoryInsurance: feeFromBreakdown(breakdown, "COMPULSORY_INSURANCE"),
    optionalBodyInsurance: feeFromBreakdown(breakdown, "OPTIONAL_BODY_INSURANCE"),
  };
}

export function saveExtras(vehicleId: number, extras: QuoteExtras) {
  sessionStorage.setItem(extrasStorageKey(vehicleId), JSON.stringify(extras));
}

export function loadExtras(vehicleId: number, fallback: QuoteExtras): QuoteExtras {
  const raw = sessionStorage.getItem(extrasStorageKey(vehicleId));
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as QuoteExtras;
    return {
      ...fallback,
      ...parsed,
      listPrice: parsed.listPrice ?? fallback.listPrice,
      discountAmount: parsed.discountAmount ?? fallback.discountAmount,
      basePolicyDiscountAmount: parsed.basePolicyDiscountAmount ?? fallback.basePolicyDiscountAmount,
      relationshipDiscount: parsed.relationshipDiscount ?? fallback.relationshipDiscount,
      bankLoan: { ...fallback.bankLoan, ...parsed.bankLoan },
      accessories: Array.isArray(parsed.accessories) ? parsed.accessories : fallback.accessories,
    };
  } catch {
    return fallback;
  }
}

export function extrasPayload(extras: QuoteExtras) {
  return {
    listPrice: extras.listPrice,
    discountAmount: extras.discountAmount,
    deposit: extras.deposit,
    bankLoan: extras.bankLoan,
    registrationTax: extras.registrationTax,
    licensePlateFee: extras.licensePlateFee,
    registrationServiceFee: extras.registrationServiceFee,
    inspectionFee: extras.inspectionFee,
    roadUseFee: extras.roadUseFee,
    compulsoryInsurance: extras.compulsoryInsurance,
    optionalBodyInsurance: extras.optionalBodyInsurance,
    micaPlateFee: extras.micaPlateFee,
    accessories: extras.accessories.filter((item) => item.name.trim() && Number(item.amount) > 0),
  };
}
