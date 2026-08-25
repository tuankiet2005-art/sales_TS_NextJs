import { describe, expect, it } from "vitest";

import { computeQuoteLoanMetrics, pickDefaultConsultingEmployee } from "./quoteBankLoan";
import type { CostBreakdown, ConsultingEmployee } from "../types";

describe("computeQuoteLoanMetrics", () => {
  it("derives bank second payment and monthly plan from loan settings", () => {
    const result = {
      estimatedOnRoadTotal: 519_880_700,
      salePrice: 465_500_000,
      listPrice: 500_000_000,
      deposit: 20_000_000,
    } as CostBreakdown;

    const metrics = computeQuoteLoanMetrics(result, {}, { monthlyInterestRate: 0.65, loanTermYears: 5 });

    expect(metrics.loanAmount).toBe(445_500_000);
    expect(metrics.bankSecond).toBe(54_380_700);
    expect(metrics.months).toBe(60);
    expect(metrics.monthlyPayment).toBeGreaterThan(0);
  });
});

describe("pickDefaultConsultingEmployee", () => {
  const employees: ConsultingEmployee[] = [
    { id: 1, code: "A", name: "Alpha" },
    { id: 2, code: "B", name: "Beta", isDefault: true },
    { id: 3, code: "C", name: "Gamma" },
  ];

  it("prefers the employee marked default", () => {
    expect(pickDefaultConsultingEmployee(employees)?.id).toBe(2);
  });

  it("falls back to the first employee when none is default", () => {
    expect(pickDefaultConsultingEmployee(employees.map((item) => ({ ...item, isDefault: false })))?.id).toBe(1);
  });
});
