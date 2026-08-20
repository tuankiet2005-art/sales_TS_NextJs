# Plan: catalog and quote fetch latency

**Date:** 2026-08-21  
**Status:** implemented

## Goal

Reduce perceived data-fetch slowness across home catalog, vehicle→quote navigation, and export/save.

## Approach

1. Bundle home catalog data server-side (`/api/catalog`)
2. Add short-lived HTTP cache headers on list/detail GETs
3. Eliminate duplicate vehicle fetch on quote page via `sessionStorage`
4. Skip redundant `calculateOnRoad` on export/save when client sends matching `breakdown`
5. Parallelize `loadQuotePageData` policy mapping
6. Add partial DB index for active vehicles by brand
7. Split category loading from vehicle list on home (fast path + reference cache)

## Verification

- `npm test` and `npm run build` in `web/`
- `npx tsx scripts/bench-quote-api.ts` for latency regression
