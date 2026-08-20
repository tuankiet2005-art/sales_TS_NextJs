---
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
title: Admin filter i18n sync - Plan
---

# Admin filter i18n sync - Plan

## Goal Capsule

**Objective:** Filter dropdown labels on admin (and catalog) pages must follow the header language, matching table and form labels.

**Product authority:** Vietnamese-first UI; `category.*` and `admin.opt.*` translation keys are the display source for coded values.

## Product Contract

### Problem

Admin LOẠI XE filter showed English DB names ("Passenger car – 4 seats") while the table showed Vietnamese ("Ô tô 4 chỗ") under the same language setting.

### Requirements

- Category filters use `category.{code}` translations.
- Enum filters (body style) use `admin.opt.{value}` translations.
- Stable filter values (codes) unchanged; labels react to language switch.

### Success criteria

- Vietnamese UI: filter and table show identical category text.
- Language switch updates filter labels without resetting filter state.

### Out of scope

- Translating brand names stored as proper nouns in the database.
- Changing API or schema field values.
