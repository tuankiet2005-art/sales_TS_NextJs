---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
title: Quote panel header vertical alignment - Plan
---

# Quote panel header vertical alignment - Plan

## Goal

Center panel titles (**Giá có thể chỉnh**, **Phụ kiện xe**) on the y-axis with their 32px icon badges on the on-road quote page.

## Root cause

`QuotePricePanel` and `QuoteAccessoriesPanel` headers use `flex items-start`, so title text sits at the top of the row instead of vertically centered against the icon square.

## Change

| File | Action |
|---|---|
| `web/src/components/QuoteAdjustments.tsx` | Use `items-center` on header row; extract shared `PanelHeader` to keep both panels aligned the same way |
| `web/src/components/AGENTS.md` | Note header row uses vertical center alignment with icon badge |

## Verification

- Visual: on-road quote page — both panel titles vertically centered with icon
- `npm run build` from `web/`
