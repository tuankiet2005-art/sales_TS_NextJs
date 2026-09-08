import { describe, expect, it } from "vitest";

import { hasBankLoanErrors, validateBankLoanInput } from "./bankLoanValidation";

describe("validateBankLoanInput", () => {
  it("accepts a valid loan", () => {
    const errors = validateBankLoanInput({
      bankId: 1,
      monthlyInterestRate: 0.65,
      loanTermYears: 5,
      fixedRatePeriodYears: 2,
      consultingEmployeeId: 3,
    });
    expect(hasBankLoanErrors(errors)).toBe(false);
  });

  it("rejects missing bank and employee", () => {
    const errors = validateBankLoanInput({
      monthlyInterestRate: 0.65,
      loanTermYears: 5,
      fixedRatePeriodYears: 0,
    });
    expect(errors.bankId).toBe("required");
    expect(errors.consultingEmployeeId).toBe("required");
  });

  it("rejects negative rate and fixed period above term", () => {
    const errors = validateBankLoanInput({
      bankId: 1,
      monthlyInterestRate: -1,
      loanTermYears: 3,
      fixedRatePeriodYears: 4,
      consultingEmployeeId: 2,
    });
    expect(errors.monthlyInterestRate).toBe("invalid");
    expect(errors.fixedRatePeriodYears).toBe("exceedsTerm");
  });
});
