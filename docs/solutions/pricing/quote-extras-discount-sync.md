---
title: Quote adjustable discount matches confirm page
date: 2026-08-20
tags: [pricing, quote, extras]
---

## Problem

Vehicle confirm showed policy discount (e.g. Attrage MT 19M) but **Giá có thể chỉnh → Giảm giá** on the quote page stayed empty. The sheet still calculated correctly because the API falls back to dealer policy when `extras.discountAmount` is unset.

## Fix

- `extrasFromVehicle` includes `vehicle.discountAmount`
- `extrasFromQuote(vehicle, breakdown)` seeds discount from the server breakdown (usage + offers)
- `OnRoadQuotePage` loads extras with that helper after `quote-load`
- `VehiclePage` writes computed policy discount into session before navigating to quote
- `loadExtras` keeps fallback discount when older session blobs omit the field

## Rule

Adjustable quote fields should mirror what the user already saw on confirm; do not rely on silent API fallbacks for display-only empty inputs.
