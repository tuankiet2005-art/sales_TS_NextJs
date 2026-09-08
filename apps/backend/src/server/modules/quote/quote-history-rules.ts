export const QUOTE_REUSE_WINDOW_MS = 2 * 60 * 1000;

export function sameQuoteAmount(left: number, right: number) {
  return Number(left) === Number(right);
}

export function withinQuoteReuseWindow(left: Date | string, right: Date | string) {
  const a = new Date(left).getTime();
  const b = new Date(right).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return false;
  }
  return Math.abs(a - b) < QUOTE_REUSE_WINDOW_MS;
}

export function isListableHistoryRow(row: { vehicleName?: string | null; onRoadTotal: number }) {
  return Boolean(row.vehicleName?.trim()) && Number(row.onRoadTotal) > 0;
}

export function shouldReuseRecentQuote(
  recent: { onRoadTotal: number; createdAt: string | Date },
  nextTotal: number,
  now = new Date(),
) {
  return sameQuoteAmount(recent.onRoadTotal, nextTotal) && withinQuoteReuseWindow(recent.createdAt, now);
}

export function collapseRecentDuplicateQuotes<
  T extends {
    customerName: string;
    vehicleId: number;
    vehicleName?: string | null;
    onRoadTotal: number;
    createdAt: string;
  },
>(rows: T[]): T[] {
  const kept: T[] = [];
  for (const row of rows) {
    if (!isListableHistoryRow(row)) {
      continue;
    }
    const duplicate = kept.some(
      (seen) =>
        seen.customerName.trim().toLowerCase() === row.customerName.trim().toLowerCase() &&
        seen.vehicleId === row.vehicleId &&
        sameQuoteAmount(seen.onRoadTotal, row.onRoadTotal) &&
        withinQuoteReuseWindow(seen.createdAt, row.createdAt),
    );
    if (!duplicate) {
      kept.push(row);
    }
  }
  return kept;
}
