import type { CostBreakdown, ConsultingEmployee, QuoteBankLoan, VehicleDetail } from "../types";

export const DEFAULT_QUOTE_BANK_LOAN: QuoteBankLoan = {
  monthlyInterestRate: 0.65,
  loanTermYears: 5,
  fixedRatePeriodYears: 2,
};

export const QUOTE_LOAN_TERM_OPTIONS = [3, 5] as const;

export function fixedRatePeriodOptions(loanTermYears: number): number[] {
  const max = Math.max(0, Math.floor(loanTermYears));
  return Array.from({ length: max + 1 }, (_, index) => index);
}

export function pickDefaultConsultingEmployee(employees: ConsultingEmployee[]): ConsultingEmployee | undefined {
  if (employees.length === 0) {
    return undefined;
  }
  return employees.find((item) => item.isDefault) ?? employees[0];
}

export function resolveQuoteBankLoan(partial?: QuoteBankLoan): QuoteBankLoan {
  return { ...DEFAULT_QUOTE_BANK_LOAN, ...partial };
}

export type QuoteLoanMetrics = {
  loanAmount: number;
  bankSecond: number;
  loanTermYears: number;
  months: number;
  monthlyInterestRate: number;
  monthlyRateDecimal: number;
  annualRatePercent: number;
  monthlyPrincipal: number;
  monthlyInterest: number;
  monthlyPayment: number;
};

export function computeQuoteLoanMetrics(
  result: CostBreakdown,
  vehicle: Pick<VehicleDetail, "defaultDeposit" | "salePrice">,
  bankLoan?: QuoteBankLoan,
): QuoteLoanMetrics {
  const resolved = resolveQuoteBankLoan(bankLoan);
  const onRoadTotal = Number(result.estimatedOnRoadTotal) || 0;
  const deposit = Number(result.deposit ?? vehicle.defaultDeposit) || 0;
  const salePrice = Number(result.salePrice ?? vehicle.salePrice ?? result.listPrice) || 0;
  const loanAmount = Math.max(salePrice - deposit, 0);
  const bankSecond = Math.max(onRoadTotal - deposit - loanAmount, 0);
  const loanTermYears = resolved.loanTermYears ?? 5;
  const months = loanTermYears * 12;
  const monthlyInterestRate = resolved.monthlyInterestRate ?? 0.65;
  const monthlyRateDecimal = monthlyInterestRate / 100;
  const annualRatePercent = monthlyInterestRate * 12;
  const monthlyPrincipal = months ? loanAmount / months : 0;
  const monthlyInterest = loanAmount * monthlyRateDecimal;
  const monthlyPayment = monthlyPrincipal + monthlyInterest;

  return {
    loanAmount,
    bankSecond,
    loanTermYears,
    months,
    monthlyInterestRate,
    monthlyRateDecimal,
    annualRatePercent,
    monthlyPrincipal,
    monthlyInterest,
    monthlyPayment,
  };
}
