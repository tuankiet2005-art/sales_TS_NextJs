# Catalog and quote fetch latency optimization

**Date:** 2026-08-21  
**Spec:** `quote-api-latency` (`/ce-optimize`)

## Problem

Users perceived slow loads: the home page fired three HTTP calls, the quote flow re-fetched the vehicle after confirm, export/save recalculated on-road costs from scratch, and list endpoints lacked short CDN/browser cache headers.

## Changes

| Layer | Change |
|---|---|
| API | `GET /api/catalog?brand=` bundles brand, categories, and vehicle list |
| API | `Cache-Control: public, max-age=60` on catalog list/detail routes |
| Server | `getCatalogBootstrap`, `brandByCodeCache`, parallel `loadQuotePageData` (calc + policy) |
| Server | `resolveQuoteCalculation` — reuse client `breakdown` on export/save when `vehicleId` matches |
| Client | Home → single bootstrap call; VehiclePage → `sessionStorage` vehicle cache |
| Client | Quote page: cached vehicle + calc-only when coming from confirm |
| DB | `idx_vehicles_active_brand` partial index in `neon-init.sql` |

## Measurement

Harness: `web/scripts/bench-quote-api.ts` (immutable for optimize runs).

| Metric | Baseline | After |
|---|---|---|
| `quote_load_latency_ms` | 149 | ~60 |
| `catalog_bootstrap_latency_ms` | (3 HTTP calls) | ~88 (1 bundled server call) |
| `quote_page_api_calls` | 2 | 1 (with vehicle cache) |
| `home_api_calls` | 3 | 1 |

Client-perceived quote navigation is faster when vehicle cache is warm (calc-only vs full quote-load).

## Follow-ups

- Apply `idx_vehicles_active_brand` on production Neon if not re-running init SQL
- Category filter could pass `categoryId` to search for smaller payloads (backlog)
