---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
title: UI motion - Plan
---

# UI motion - Plan

## Goal

Make customer-facing pages feel dynamic with smooth, consistent transitions without adding dependencies.

## Implementation

| Area | Change |
|---|---|
| `globals.css` | Motion tokens, keyframes, reduced-motion guard |
| `lib/motion.ts` | Shared class helpers + stagger delays |
| `PageMotion.tsx` + `AppShell` | Page enter on route change |
| Catalog views | Staggered cards, filter pill transitions |
| Header | Nav + mobile menu slide |
| Vehicle confirm | Price pop on policy change |
| Quote page | Sheet scale-in after recalculate |

## Verification

- `npm run build` from `web/`
- Manual: navigate brand → catalog → vehicle → quote; toggle usage on confirm page
