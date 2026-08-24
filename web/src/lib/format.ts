const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const vndPlain = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** Admin columns and form keys that store VND amounts (not percentages or counts). */
export const MONEY_FIELD_KEYS = new Set([
  "listPrice",
  "fixedAmount",
  "defaultDeposit",
  "discountAmount",
  "deposit",
  "registrationServiceFee",
  "micaPlateFee",
  "inspectionFee",
  "optionalBodyInsurance",
  "onRoadTotal",
  "accessoriesTotal",
  "amount",
]);

export function isMoneyField(key: string): boolean {
  return MONEY_FIELD_KEYS.has(key);
}

export function formatVnd(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") {
    return vnd.format(0);
  }
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return "";
  }
  return vnd.format(value);
}

/** Grouped digits without the currency symbol — used on the dealer quote sheet beside "ĐVT: VNĐ". */
export function formatQuoteAmount(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") {
    return "";
  }
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return "";
  }
  return vndPlain.format(value);
}

export function formatMoneyColumn(column: string, value: unknown): string | null {
  if (!isMoneyField(column)) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return formatVnd(numeric);
}

/** Strip grouping and currency symbols from user input. */
export function parseMoneyInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) {
    return undefined;
  }
  const value = Number(digits);
  return Number.isFinite(value) ? value : undefined;
}

export function formatRegion(region: string): string {
  switch (region) {
    case "NORTH":
      return "North";
    case "CENTRAL":
      return "Central";
    case "SOUTH":
      return "South";
    default:
      return region;
  }
}
