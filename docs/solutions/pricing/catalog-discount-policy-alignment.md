---
title: Catalog discount aligns with dealer policy and quote math
date: 2026-08-20
tags: [pricing, catalog, dealer-policy, quote]
---

## Problem

Vehicle confirm page and catalog cards showed legacy `vehicles.discount_amount` from the Excel seed (e.g. Attrage CVT Premium: 59M off → 431M). On-road quotes and Excel export used `dealer-policy.yml` private percent (5% → 24.5M off → 465.5M). Same trim, two discounts.

The confirm page also labeled the hero price as "Giá niêm yết" while displaying sale price.

## Root cause

- `mapVehicleSummary` read `discount_amount` / `sale_price` columns copied from an older `bang-bao-gia.xlsx` snapshot.
- `calculateOnRoadCost` / `priceVehicle` always derive discount from dealer policy unless the quote extras override `discountAmount`.

## Fix

1. `mapVehicleSummaryWithPolicy` applies `priceVehicle(policy, listPrice, PRIVATE, …)` for public catalog APIs.
2. `VehiclePage` uses `priceVehicleFromPolicy` so usage type and offer toggles update the displayed discount before quote.
3. Hero label uses `salePrice` ("Giá bán"); list price and discount stay in the detail line.
4. Attrage CVT Premium seed, `neon-init.sql`, and Excel template row updated to 24.5M / 465.5M for operator consistency.

## Rule

Public catalog prices follow **dealer policy** (default private usage). Legacy DB discount columns are for admin/seed reference only until explicitly wired into quote overrides.

## Verification

- `npm test` — `mappers.test.ts`, `dealerPricing.test.ts`
- Manual: Attrage CVT Premium confirm page shows 465.500.000 ₫, Giảm giá 24.500.000 ₫; quote sheet matches after Recalculate
