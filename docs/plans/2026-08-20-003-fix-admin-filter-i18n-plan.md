---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
title: Admin filter i18n sync - Plan
---

# Admin filter i18n sync - Plan

## Goal Capsule

**Objective:** Admin and catalog filter dropdown labels follow the active UI language (`vi` first), matching table cells and form selects.

**Product authority:** Header language switcher drives all visible labels; category codes and enum values stay as filter values, not display text.

**Open blockers:** None.

## Product Contract

### Requirements

- **R1:** Category filter options on `/admin` vehicles and fee-rules tabs show `category.{code}` translations, not English DB `name`.
- **R2:** Body-style (`vehicleType`) filter on admin vehicles tab uses `admin.opt.{value}` like form selects.
- **R3:** Catalog home body-style filter uses the same `admin.opt.*` labels for consistency.
- **R4:** Filter values remain stable codes/enums; only labels change with language.

### Key Decisions

- **KTD1:** Reuse existing `optionLabel()` in `AdminDataPage` rather than duplicating translation lookup — session-settled: user-directed

### Acceptance Examples

- **AE1:** With UI language `vi`, LOẠI XE filter shows "Ô tô 4 chỗ" while table column shows the same text.
- **AE2:** Switching to `en` updates filter labels to English without breaking filtering.

## Implementation Units

### U1. Wire admin filter labels through i18n

**Goal:** Category and body-style admin filters use `optionLabel`.

**Files:** `web/src/views/AdminDataPage.tsx`

**Approach:** Map filter `options` labels through existing `optionLabel` with the same `Field` refs/types as table/form cells.

**Verification:** `npm run build` from `web/`; manual check admin vehicles tab in Vietnamese.

### U2. Align catalog body-style filter

**Goal:** Home page `vehicleType` filter labels follow `admin.opt.*`.

**Files:** `web/src/views/HomePage.tsx`

**Approach:** Build `vehicleTypeOptions` with `t('admin.opt.${type}')` fallback pattern.

**Verification:** `npm test` from `web/`.

## Verification Contract

- `npm run build` in `web/`
- `npm test` in `web/`

## Definition of Done

- Filter labels match table/form labels per active language on admin vehicles tab.
- Changes committed and pushed to `main`.
