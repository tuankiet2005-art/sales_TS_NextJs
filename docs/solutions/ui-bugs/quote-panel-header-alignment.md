---
title: Quote panel header icon and title alignment
date: 2026-08-21
tags: [ui, quote, alignment]
---

## Problem

On the on-road quote page, **Giá có thể chỉnh** and **Phụ kiện xe** titles sat above the vertical center of their icon badges because the header row used `items-start`.

## Fix

Shared `PanelHeader` in `QuoteAdjustments.tsx` with `flex items-center gap-2` and `leading-none` on the title so both panels align the same way.

## Rule

Icon + single-line title rows use vertical center alignment (`items-center`), not `items-start`.
