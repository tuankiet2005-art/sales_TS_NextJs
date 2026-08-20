---
title: Admin filter labels must use i18n keys, not DB names
date: 2026-08-20
category: ui-bugs
module: web
component: AdminDataPage
problem_type: ui_bugs
tags:
  - i18n
  - admin
  - filters
  - ListFilterSelect
symptoms:
  - Category filter dropdown shows English DB names while table shows Vietnamese translations
  - Body-style filter shows raw enum strings instead of admin.opt translations
root_cause: Filter option labels were built from category.name and raw vehicleType strings instead of reusing the existing optionLabel/t() lookup used by table cells and form selects.
resolution_type: code_fix
---

# Admin filter labels must use i18n keys, not DB names

## Problem

On `/admin` with Vietnamese UI, the LOẠI XE filter listed English values like "Passenger car – 4 seats" while the table column showed "Ô tô 4 chỗ".

## Symptoms

- Mismatch between filter dropdown text and table column for the same field
- Body-style (KIỂU DÁNG) filter showed "SUV", "Sedan" instead of translated labels

## Solution

Reuse existing translation helpers when building `ListFilterSelect` options:

```tsx
// Category filter — use category.{code} keys
options={categories.map((item) => ({
  value: item.code,
  label: optionLabel(item.code, { key: "categoryCode", type: "select", ref: "category" }),
}))}

// Body style — use admin.opt.{value} keys (same as form selects)
options={(FIELDS.vehicles.find((f) => f.key === "vehicleType")?.options ?? []).map((option) => ({
  value: option,
  label: optionLabel(option, { key: "vehicleType", type: "select" }),
}))}
```

Catalog `HomePage` body-style filter should apply the same `admin.opt.*` pattern.

## Why This Works

Filter **values** stay as stable codes/enums for query logic. Only **labels** go through `useI18n`, matching `displayCell`, form `FieldInput`, and the rest of the app contract in `web/src/views/AGENTS.md`.

## Prevention

When adding `ListFilterSelect` to a page that already has `optionLabel()` or `t('category.*')` / `t('admin.opt.*')` for the same field, build filter labels through that helper — never pass raw `item.name` from admin API rows.

## Related

- `web/src/views/AdminDataPage.tsx` — `optionLabel()`, filter bar
- `web/src/i18n/translations.ts` — `category.*`, `admin.opt.*` keys
- `docs/plans/2026-08-20-003-fix-admin-filter-i18n-plan.md`
