---
title: Admin catalog duplicate API fetches
category: performance-issues
problem_type: duplicate_network_requests
component: AdminDataPage
date: 2026-08-21
---

# Admin catalog duplicate API fetches

## Problem

Opening `/admin` fired the same list endpoints many times (`brands`, `categories`, `locations`, `fee-definitions`, `vehicles`), slowing the page to ~20s finish in DevTools.

Two causes stacked:

1. **Eager prefetch** — the page loaded all four lookup lists on every tab, even when the active tab only needed one or two.
2. **No in-flight dedup** — overlapping `load()` calls (initial mount, tab effect, remount) each started their own fetch before the first completed.

## Fix

1. Load only the active tab’s list plus lookups declared for that tab (`TAB_LOOKUPS`).
2. Centralize list caching in `web/src/lib/adminCatalogCache.ts` with module-level cache + shared in-flight promises so concurrent callers await one request.
3. Invalidate a single cache key on save/delete for the edited tab.

## Verification

- `npm test` in `web/`
- Network tab on `/admin` (vehicles tab): expect **3** list requests on first visit (`brands`, `categories`, `vehicles`), not 5+ repeats.
