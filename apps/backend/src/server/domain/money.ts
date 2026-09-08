export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

export function roundMoney(value: number): number {
  return Math.round(value);
}

export function percentOf(price: number, percentage: number | null | undefined): number {
  if (!percentage) {
    return 0;
  }
  return roundMoney((price * percentage) / 100);
}
