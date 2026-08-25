"use client";

import { Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/LanguageContext";
import { validateBankLoanInput } from "../lib/bankLoanValidation";
import { fixedRatePeriodOptions, QUOTE_LOAN_TERM_OPTIONS } from "../lib/quoteBankLoan";
import type { Bank, ConsultingEmployee, QuoteBankLoan } from "../types";
import { SearchableCombobox } from "./SearchableCombobox";

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mist text-copper">
        <Landmark className="h-4 w-4" />
      </span>
      <span className="flex h-8 items-center text-sm font-semibold leading-none">{title}</span>
    </div>
  );
}

export function QuoteBankLoanPanel({
  value,
  banks,
  employees,
  onChange,
}: {
  value: QuoteBankLoan;
  banks: Bank[];
  employees: ConsultingEmployee[];
  onChange: (next: QuoteBankLoan) => void;
}) {
  const { t } = useI18n();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = useMemo(() => validateBankLoanInput(value), [value]);
  const catalogEmpty = banks.length === 0 && employees.length === 0;

  function touch(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function fieldError(key: "bankId" | "consultingEmployeeId") {
    if (!touched[key]) {
      return undefined;
    }
    const code = errors[key];
    if (!code) {
      return undefined;
    }
    return t(`bankLoan.validation.${key}.${code}`);
  }

  return (
    <section className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card">
      <PanelHeader title={t("bankLoan.panelTitle")} />

      {catalogEmpty ? (
        <p className="mt-3 text-sm text-ink/60">{t("bankLoan.emptyCatalog")}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-ink">{t("bankLoan.field.bank")}</span>
          <SearchableCombobox
            items={banks}
            value={value.bankId}
            disabled={catalogEmpty}
            onChange={(bankId) => {
              touch("bankId");
              const bank = banks.find((item) => item.id === bankId);
              onChange({ ...value, bankId, bankName: bank?.name });
            }}
            onBlur={() => touch("bankId")}
            getKey={(item) => item.id}
            getLabel={(item) => item.name}
            getSearchText={(item) => [item.code]}
            placeholder={t("bankLoan.searchBank")}
            error={fieldError("bankId")}
          />
        </label>

        <div className="form-fields-row form-fields-row--bank-loan-metrics">
          <label className="block">
          <span className="text-sm font-medium text-ink">{t("bankLoan.field.monthlyInterestRate")}</span>
          <div className="mt-1 flex h-12 overflow-hidden rounded-xl border border-ink/10 bg-paper">
            <input
              type="number"
              min={0}
              step="0.01"
              value={Number.isFinite(value.monthlyInterestRate) ? value.monthlyInterestRate : ""}
              onChange={(event) => {
                const parsed = event.target.value === "" ? undefined : Number(event.target.value);
                onChange({ ...value, monthlyInterestRate: parsed });
              }}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 text-ink focus:outline-none"
            />
            <span className="flex shrink-0 items-center border-l border-ink/10 px-3 text-sm text-ink/50">
              {t("bankLoan.unit.monthlyRate")}
            </span>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">{t("bankLoan.field.loanTermYears")}</span>
          <select
            value={value.loanTermYears ?? 5}
            onChange={(event) => {
              const loanTermYears = Number(event.target.value);
              const fixedRatePeriodYears = Math.min(value.fixedRatePeriodYears ?? 2, loanTermYears);
              onChange({ ...value, loanTermYears, fixedRatePeriodYears });
            }}
            className="mt-1 h-12 w-full rounded-xl border border-ink/10 bg-paper px-3 text-ink"
          >
            {QUOTE_LOAN_TERM_OPTIONS.map((years) => (
              <option key={years} value={years}>
                {years} {t("bankLoan.years")}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">{t("bankLoan.field.fixedRatePeriodYears")}</span>
          <select
            value={value.fixedRatePeriodYears ?? 2}
            onChange={(event) =>
              onChange({ ...value, fixedRatePeriodYears: Number(event.target.value) })
            }
            className="mt-1 h-12 w-full rounded-xl border border-ink/10 bg-paper px-3 text-ink"
          >
            {fixedRatePeriodOptions(value.loanTermYears ?? 5).map((years) => (
              <option key={years} value={years}>
                {years} {t("bankLoan.years")}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">{t("bankLoan.field.consultingEmployee")}</span>
          <SearchableCombobox
            items={employees}
            value={value.consultingEmployeeId}
            disabled={catalogEmpty}
            onChange={(consultingEmployeeId) => {
              touch("consultingEmployeeId");
              const employee = employees.find((item) => item.id === consultingEmployeeId);
              onChange({
                ...value,
                consultingEmployeeId,
                consultingEmployeeName: employee?.name,
                consultingEmployeePhone: employee?.phone,
              });
            }}
            onBlur={() => touch("consultingEmployeeId")}
            getKey={(item) => item.id}
            getLabel={(item) => (item.phone ? `${item.name} — ${item.phone}` : item.name)}
            getSearchText={(item) => [item.code, item.phone ?? ""]}
            placeholder={t("bankLoan.searchEmployee")}
            error={fieldError("consultingEmployeeId")}
          />
          </label>
        </div>
      </div>
    </section>
  );
}
