export type BankLoanValidationErrors = Partial<
  Record<
    "bankId" | "monthlyInterestRate" | "loanTermYears" | "fixedRatePeriodYears" | "consultingEmployeeId",
    string
  >
>;

export function validateBankLoanInput(input: {
  bankId?: number | null;
  monthlyInterestRate?: number | null;
  loanTermYears?: number | null;
  fixedRatePeriodYears?: number | null;
  consultingEmployeeId?: number | null;
}): BankLoanValidationErrors {
  const errors: BankLoanValidationErrors = {};

  if (!input.bankId || input.bankId <= 0) {
    errors.bankId = "required";
  }

  const rate = Number(input.monthlyInterestRate);
  if (!Number.isFinite(rate) || rate < 0) {
    errors.monthlyInterestRate = "invalid";
  }

  const term = Number(input.loanTermYears);
  if (!Number.isInteger(term) || term <= 0) {
    errors.loanTermYears = "invalid";
  }

  const fixedPeriod = Number(input.fixedRatePeriodYears ?? 0);
  if (!Number.isInteger(fixedPeriod) || fixedPeriod < 0) {
    errors.fixedRatePeriodYears = "invalid";
  } else if (Number.isInteger(term) && term > 0 && fixedPeriod > term) {
    errors.fixedRatePeriodYears = "exceedsTerm";
  }

  if (!input.consultingEmployeeId || input.consultingEmployeeId <= 0) {
    errors.consultingEmployeeId = "required";
  }

  return errors;
}

export function hasBankLoanErrors(errors: BankLoanValidationErrors) {
  return Object.keys(errors).length > 0;
}
