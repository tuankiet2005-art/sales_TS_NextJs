# Strategy digest — quote-api-latency

## Batch 1 results

| Metric | Baseline | Final | Delta |
|--------|----------|-------|-------|
| quote_load_latency_ms | 149 | 122 | -27 ms (-18%) |
| calc_latency_ms | 69 | 58 | -11 ms (-16%) |
| duplicate_vehicle_lookups | 2 | 1 | -1 |
| quote_page_api_calls | 2 | 1 | -1 |

## What worked

- **Policy snapshot dedup** (`policy-store.ts`): concurrent `getFeePolicy`/`getDealerPolicy`/`getPlateRegions` now share one `loadPolicySnapshot` in-flight promise
- **Fee data cache** (`catalog-service.ts`): `listActiveFeeDefinitions` + `listActiveFeeRules` cached until `invalidateCatalogCache()`
- **Single quote load** (`loadQuotePageData` + `POST /api/quote-load`): one vehicle fetch, one handler round trip
- **Export/save dedup**: `calculateOnRoad` returns `vehicleRow`; export and history no longer re-query vehicle

## Remaining frontier

- HomePage still fetches all brand vehicles then filters client-side; pass `categoryId` to `/api/vehicles/search`
- Vehicle images still one HTTP request per color blob
- Neon HTTP driver: each Drizzle query is a separate round trip; batching SQL would need schema/repository redesign

## Categories tried

| Category | Tried | Kept |
|----------|-------|------|
| architecture | 1 | 1 |
| data-handling | 1 | 1 |
| signal-extraction | 1 | 1 |
