/**
 * Benchmark public data-fetch paths: full vs paginated vs slim columns.
 * Outputs JSON to stdout.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import { getDb } from "../src/server/db/client";
import { quoteHistory } from "../src/server/db/schema";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  if (process.env.DATABASE_URL?.trim()) {
    return;
  }
  try {
    const content = readFileSync(resolve(webRoot, ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // DATABASE_URL must be set in environment
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function main() {
  loadEnvLocal();

  if (!process.env.DATABASE_URL?.trim()) {
    console.error(JSON.stringify({ error: "DATABASE_URL is not set" }));
    process.exit(1);
  }

  const brandCode = process.env.BENCH_BRAND_CODE ?? "mitsubishi";
  const runs = Number(process.env.BENCH_RUNS ?? 5);

  const { invalidateCatalogCache } = await import("../src/server/services/catalog-service");
  const { invalidatePolicyCache } = await import("../src/server/config/policy-store");
  const catalogService = await import("../src/server/services/catalog-service");
  const quoteService = await import("../src/server/services/quote-history-service");

  const samples = {
    vehicles_full_ms: [] as number[],
    vehicles_page_ms: [] as number[],
    home_flow_ms: [] as number[],
    quotes_list_ms: [] as number[],
    quotes_full_payload_ms: [] as number[],
    categories_ms: [] as number[],
  };

  let vehicleCount = 0;
  let quoteCount = 0;

  for (let i = 0; i < runs; i++) {
    invalidateCatalogCache();
    invalidatePolicyCache();

    const fullStart = performance.now();
    const full = await catalogService.searchVehicles({ brandCode });
    samples.vehicles_full_ms.push(performance.now() - fullStart);
    vehicleCount = full.length;

    invalidateCatalogCache();
    invalidatePolicyCache();

    const pageStart = performance.now();
    await catalogService.searchVehiclesPage({ brandCode, page: 1, pageSize: 10 });
    samples.vehicles_page_ms.push(performance.now() - pageStart);

    invalidateCatalogCache();
    invalidatePolicyCache();

    const homeStart = performance.now();
    await Promise.all([
      catalogService.getCategories(),
      catalogService.getBrand(brandCode),
      catalogService.getVehicleFilterOptions(brandCode),
      catalogService.searchVehiclesPage({ brandCode, page: 1, pageSize: 10 }),
    ]);
    samples.home_flow_ms.push(performance.now() - homeStart);

    invalidateCatalogCache();
    invalidatePolicyCache();

    const catStart = performance.now();
    await catalogService.getCategories();
    samples.categories_ms.push(performance.now() - catStart);

    const listStart = performance.now();
    const list = await quoteService.searchQuotes({ page: 1, pageSize: 10 });
    samples.quotes_list_ms.push(performance.now() - listStart);
    quoteCount = list.total;

    const db = getDb();
    const fullQuoteStart = performance.now();
    await db.select().from(quoteHistory).orderBy(quoteHistory.createdAt).limit(100);
    samples.quotes_full_payload_ms.push(performance.now() - fullQuoteStart);
  }

  const result = {
    vehicle_count: vehicleCount,
    quote_count: quoteCount,
    vehicles_full_ms: Math.round(median(samples.vehicles_full_ms)),
    vehicles_page_ms: Math.round(median(samples.vehicles_page_ms)),
    vehicles_page_speedup_ratio:
      median(samples.vehicles_full_ms) / Math.max(median(samples.vehicles_page_ms), 1),
    home_flow_ms: Math.round(median(samples.home_flow_ms)),
    categories_ms: Math.round(median(samples.categories_ms)),
    quotes_list_ms: Math.round(median(samples.quotes_list_ms)),
    quotes_full_payload_ms: Math.round(median(samples.quotes_full_payload_ms)),
    quotes_list_speedup_ratio:
      median(samples.quotes_full_payload_ms) / Math.max(median(samples.quotes_list_ms), 1),
    sample_runs: runs,
  };

  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
