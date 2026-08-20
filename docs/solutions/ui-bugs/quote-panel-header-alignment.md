---
title: Quote panel header icon and title alignment
date: 2026-08-21
tags: [ui, quote, alignment]
---

## Problem

On the on-road quote page, **Giá có thể chỉnh** and **Phụ kiện xe** titles sat above the vertical center of their icon badges because the header row used `items-start`.

## Fix

Shared `PanelHeader` in `QuoteAdjustments.tsx`: icon badge and title both use `h-8`; title sits in `flex h-8 items-center` so text optically centers on the icon row.

## Rule

Icon + single-line title rows use vertical center alignment (`items-center`), not `items-start`.
