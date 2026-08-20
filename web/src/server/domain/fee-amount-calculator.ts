import { percentOf, roundMoney, toNumber } from "./money";
import type { FeeRuleRow, VehicleRow } from "./types";

export function calculateFeeAmount(rule: FeeRuleRow, vehicle: VehicleRow): number {
  const base = taxBase(vehicle);
  let amount = 0;
  switch (rule.calculationType) {
    case "FIXED":
      amount = toNumber(rule.fixedAmount);
      break;
    case "PERCENT_OF_LIST_PRICE":
      amount = percentOf(base, toNumber(rule.percentage));
      break;
    case "PERCENT_WITH_BOUNDS":
      amount = applyBounds(
        percentOf(base, toNumber(rule.percentage)),
        rule.minAmount != null ? toNumber(rule.minAmount) : null,
        rule.maxAmount != null ? toNumber(rule.maxAmount) : null,
      );
      break;
    default:
      amount = 0;
  }
  return roundMoney(amount);
}

export function describeFeeRule(rule: FeeRuleRow): string {
  switch (rule.calculationType) {
    case "FIXED":
      return "Fixed amount";
    case "PERCENT_OF_LIST_PRICE":
      return `${formatPercent(rule.percentage)} of list price`;
    case "PERCENT_WITH_BOUNDS": {
      let bounds = "";
      if (rule.minAmount != null) {
        bounds += `, min ${toNumber(rule.minAmount)}`;
      }
      if (rule.maxAmount != null) {
        bounds += `, max ${toNumber(rule.maxAmount)}`;
      }
      return `${formatPercent(rule.percentage)} of list price${bounds}`;
    }
    default:
      return "";
  }
}

function taxBase(vehicle: VehicleRow): number {
  if (vehicle.taxBasePrice != null) {
    return toNumber(vehicle.taxBasePrice);
  }
  return toNumber(vehicle.listPrice);
}

function applyBounds(amount: number, min: number | null, max: number | null): number {
  let result = amount;
  if (min != null && result < min) {
    result = min;
  }
  if (max != null && result > max) {
    result = max;
  }
  return result;
}

function formatPercent(percentage: string | number | null | undefined): string {
  const value = toNumber(percentage);
  return `${value}%`;
}
