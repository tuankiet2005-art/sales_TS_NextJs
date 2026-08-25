"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../i18n/LanguageContext";
import { hasBankLoanErrors, validateBankLoanInput } from "../lib/bankLoanValidation";
import { fixedRatePeriodOptions } from "../lib/quoteBankLoan";
import type { AdminBank, AdminBankLoan, AdminConsultingEmployee } from "../types";
import { SearchableCombobox } from "./SearchableCombobox";

export function BankLoanForm({
  value,
  banks,
  employees,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: AdminBankLoan;
  banks: AdminBank[];
  employees: AdminConsultingEmployee[];
  saving?: boolean;
  onChange: (next: AdminBankLoan) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const activeBanks = useMemo(() => banks.filter((item) => item.active !== false), [banks]);
  const activeEmployees = useMemo(() => employees.filter((item) => item.active !== false), [employees]);

  const errors = useMemo(() => validateBankLoanInput(value), [value]);

  function fieldError(key: keyof typeof errors) {
    if (!touched[key] && !touched.submit) {
      return undefined;
    }
    const code = errors[key];
    if (!code) return undefined;
    return t(`bankLoan.validation.${key}.${code}`);
  }

  function touch(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-ink">{t("bankLoan.field.bank")}</span>
        <SearchableCombobox
          items={activeBanks}
          value={value.bankId || undefined}
          onChange={(bankId) => {
            touch("bankId");
            onChange({ ...value, bankId });
          }}
          getKey={(item) => item.id ?? 0}
          getLabel={(item) => item.name}
          getSearchText={(item) => [item.code]}
          placeholder={t("bankLoan.searchBank")}
          error={fieldError("bankId")}
        />
      </label>

      <div className="form-fields-row form-fields-row--bank-loan-metrics">
      <label className="block">
        <span className="text-sm font-medium text-ink">{t("bankLoan.field.monthlyInterestRate")}</span>
        <div
          className={`mt-1 flex h-12 overflow-hidden rounded-xl border bg-paper ${
            fieldError("monthlyInterestRate") ? "border-red-500" : "border-ink/10"
          }`}
        >
          <input
            type="number"
            min={0}
            step="0.01"
            value={Number.isFinite(value.monthlyInterestRate) ? value.monthlyInterestRate : ""}
            onChange={(event) => {
              touch("monthlyInterestRate");
              const parsed = event.target.value === "" ? NaN : Number(event.target.value);
              onChange({ ...value, monthlyInterestRate: parsed });
            }}
            onBlur={() => touch("monthlyInterestRate")}
            className="min-w-0 flex-1 border-0 bg-transparent px-3 text-ink focus:outline-none"
          />
          <span className="flex shrink-0 items-center border-l border-ink/10 px-3 text-sm text-ink/50">
            {t("bankLoan.unit.monthlyRate")}
          </span>
        </div>
        {fieldError("monthlyInterestRate") ? (
          <p className="mt-1 text-xs text-red-600">{fieldError("monthlyInterestRate")}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">{t("bankLoan.field.loanTermYears")}</span>
        <input
          type="number"
          min={1}
          step={1}
          value={Number.isFinite(value.loanTermYears) ? value.loanTermYears : ""}
          onChange={(event) => {
            touch("loanTermYears");
            const parsed = event.target.value === "" ? NaN : Number(event.target.value);
            const loanTermYears = parsed;
            const fixedRatePeriodYears = Number.isFinite(loanTermYears)
              ? Math.min(value.fixedRatePeriodYears ?? 0, loanTermYears)
              : value.fixedRatePeriodYears;
            onChange({ ...value, loanTermYears, fixedRatePeriodYears });
          }}
          onBlur={() => touch("loanTermYears")}
          className={`mt-1 h-12 w-full rounded-xl border bg-paper px-3 text-ink ${
            fieldError("loanTermYears") ? "border-red-500" : "border-ink/10"
          }`}
        />
        {fieldError("loanTermYears") ? (
          <p className="mt-1 text-xs text-red-600">{fieldError("loanTermYears")}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">{t("bankLoan.field.fixedRatePeriodYears")}</span>
        <select
          value={Number.isFinite(value.fixedRatePeriodYears) ? value.fixedRatePeriodYears : 0}
          onChange={(event) => {
            touch("fixedRatePeriodYears");
            onChange({ ...value, fixedRatePeriodYears: Number(event.target.value) });
          }}
          onBlur={() => touch("fixedRatePeriodYears")}
          className={`mt-1 h-12 w-full rounded-xl border bg-paper px-3 text-ink ${
            fieldError("fixedRatePeriodYears") ? "border-red-500" : "border-ink/10"
          }`}
        >
          {fixedRatePeriodOptions(Number.isFinite(value.loanTermYears) ? value.loanTermYears : 5).map((years) => (
            <option key={years} value={years}>
              {years} {t("bankLoan.years")}
            </option>
          ))}
        </select>
        {fieldError("fixedRatePeriodYears") ? (
          <p className="mt-1 text-xs text-red-600">{fieldError("fixedRatePeriodYears")}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">{t("bankLoan.field.consultingEmployee")}</span>
        <SearchableCombobox
          items={activeEmployees}
          value={value.consultingEmployeeId || undefined}
          onChange={(consultingEmployeeId) => {
            touch("consultingEmployeeId");
            onChange({ ...value, consultingEmployeeId });
          }}
          getKey={(item) => item.id ?? 0}
          getLabel={(item) => (item.phone ? `${item.name} — ${item.phone}` : item.name)}
          getSearchText={(item) => [item.code, item.phone ?? ""]}
          placeholder={t("bankLoan.searchEmployee")}
          error={fieldError("consultingEmployeeId")}
        />
      </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setTouched({ submit: true });
            if (hasBankLoanErrors(errors)) {
              return;
            }
            void onSubmit();
          }}
          className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {saving ? t("admin.saving") : t("admin.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-lg px-4 text-sm text-ink/60"
        >
          {t("admin.cancel")}
        </button>
      </div>
    </div>
  );
}
