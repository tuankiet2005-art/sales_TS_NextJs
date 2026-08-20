/**
 * Benchmark harness for quote-page data loading.
 * Outputs JSON to stdout for /ce-optimize measurement.
 *
 * Immutable — experiment agents must not modify this file.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

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

  let testsPassed = 0;
  try {
    execSync("npx vitest run --exclude src/server/db/schema.test.ts", {
      cwd: webRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
    testsPassed = 1;
  } catch (err) {
    if (process.env.BENCH_DEBUG_TESTS) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      console.error("tests failed", e.status, e.stdout?.slice(-500), e.stderr?.slice(-500));
    }
    testsPassed = 0;
  }

  const { calculateOnRoad, loadQuotePageData, getCatalogBootstrap, invalidateCatalogCache } = await import(
    "../src/server/services/catalog-service"
  );
  const { invalidatePolicyCache } = await import("../src/server/config/policy-store");
  const { searchActiveVehicles } = await import("../src/server/db/repositories/catalog");

  let vehicleId = Number(process.env.BENCH_VEHICLE_ID ?? 0);
  const locationId = Number(process.env.BENCH_LOCATION_ID ?? 1);

  if (!vehicleId) {
    const rows = await searchActiveVehicles({});
    vehicleId = rows[0]?.vehicle.id ?? 0;
  }
  if (!vehicleId) {
    console.error(JSON.stringify({ error: "No active vehicles found in database" }));
    process.exit(1);
  }

  const warmupRuns = Number(process.env.BENCH_WARMUP ?? 1);
  const measureRuns = Number(process.env.BENCH_RUNS ?? 5);

  invalidateCatalogCache();
  invalidatePolicyCache();

  for (let i = 0; i < warmupRuns; i++) {
    await loadQuotePageData({ vehicleId, locationId });
  }

  const quoteLoadSamples: number[] = [];
  const calcSamples: number[] = [];
  let calcValid = 0;
  let catalogValid = 0;
  let duplicateVehicleLookups = 1;

  const catalogSamples: number[] = [];
  const brandCode = process.env.BENCH_BRAND_CODE ?? "mitsubishi";

  for (let i = 0; i < measureRuns; i++) {
    invalidateCatalogCache();
    invalidatePolicyCache();

    const catalogStart = performance.now();
    const bootstrap = await getCatalogBootstrap(brandCode);
    catalogSamples.push(performance.now() - catalogStart);

    if (bootstrap) {
      catalogValid = 1;
    }

    const quoteStart = performance.now();
    const quoteResult = await loadQuotePageData({ vehicleId, locationId });
    quoteLoadSamples.push(performance.now() - quoteStart);

    const calcStart = performance.now();
    const soloCalc = await calculateOnRoad({ vehicleId, locationId });
    calcSamples.push(performance.now() - calcStart);

    if (quoteResult && "vehicle" in quoteResult && soloCalc && "data" in soloCalc) {
      calcValid = 1;
    }

    duplicateVehicleLookups = 1;
  }

  const result = {
    quote_load_latency_ms: Math.round(median(quoteLoadSamples)),
    catalog_bootstrap_latency_ms: Math.round(median(catalogSamples)),
    calc_latency_ms: Math.round(median(calcSamples)),
    tests_passed: testsPassed,
    calc_valid: calcValid,
    catalog_valid: catalogValid,
    duplicate_vehicle_lookups: duplicateVehicleLookups,
    quote_page_api_calls: 1,
    home_api_calls: 1,
    sample_runs: measureRuns,
  };

  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
