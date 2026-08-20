---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
title: Quote panel header optical center - Plan
---

# Quote panel header optical center - Plan

## Problem

`items-center` on the header row still looks top-heavy: the title line box is shorter than the 32px icon badge, so cap-height sits above the icon’s visual center.

## Fix

Give the title the same `h-8` as the icon badge and center text inside that box (`flex h-8 items-center`).

## Verification

Visual check on on-road quote page; `npm run build` from `web/`.
