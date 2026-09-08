---
title: Quote sheet CÁC MÀU XE color grid layout and photo overlay
date: 2026-09-08
category: ui-bugs
module: quote-sheet
problem_type: ui_bug
component: documentation
symptoms:
  - "Color labels visible without vehicle photos until background cutout finished loading"
  - "Car photos up to 299px tall overflowing a 170px color-grid slot and overlapping each other"
  - "Photos pushed to far left/right edges with a large empty gap in the center"
  - "Internal cross borders (+ shape) when dealer template uses one outer border only"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - quote-sheet
  - quote-color-grid
  - report-color-photo
  - ca-mau-xe
  - onroad-quote
related_components:
  - quote-export
---

# Quote sheet CÁC MÀU XE color grid layout and photo overlay

## Problem

The on-screen **CÁC MÀU XE** section on the quote sheet showed broken layout: labels without photos, overlapping images, photos stuck to the edges, or an unwanted “+” of internal borders. The dealer Excel template expects a centered 2-column photo grid with labels beside each image and a single outer border.

## Symptoms

- Labels such as `ĐEN (X37)` rendered while photos were still invisible (`ReportColorPhoto` quiet mode returned `size-0` until cutout loaded).
- Measured color images reached **299px** height inside a **170px** overlay slot, causing overlap and visual clutter.
- Absolute-positioning and edge-aligned flex layouts left a wide empty band in the middle of the section.
- Internal row/column borders appeared when the user wanted only one border around the whole block.

## What Didn't Work

- **Tight absolute-position rects** (`colorGridCellRectsLeft`) — photos were left-aligned but still lacked labels/borders matching the dealer sheet.
- **Internal 2×2 cross borders with corner labels** — matched an early interpretation but not the dealer wireframe (no “+” in the center).
- **Large padded inner wrapper (`h-[94%] w-[90%]`)** — wasted space and kept labels at the far edges.
- **Relying on `npm start` without rebuild** — production `next start` served stale bundles; fixes looked “not applied” after code changes.

## Solution

### 1. Shared 2-column grid layout (`packages/shared/src/quote/colorGridLayout.ts`)

- `colorGridRows(count)` builds a **2-column** grid: 4 photos → 2×2, 6 → 2×3, odd counts → centered last row (e.g. 5 → 2+2+1).
- `orderedReportColors` caps at **6** colors (was 5).
- Frontend imports this module from `@onroad/shared/quote/colorGridLayout` (removed duplicate `apps/frontend/.../colorGridLayout.ts`).
- Word export composite (`quote-docx-fill.ts`) uses the same `colorGridCellRects` helper.

### 2. `QuoteColorGrid` overlay (`apps/frontend/src/features/quote/components/QuoteColorGrid.tsx`)

- CSS grid with `gridTemplateColumns/Rows: repeat(n, minmax(0, 1fr))` filling the Excel overlay slot.
- `overflow-hidden` on the container and cells so photos cannot exceed row height.
- Dealer label pattern: left column **label + photo**, right column **photo + label** (`flex-row-reverse` on the right).
- **Single outer border** only (`border border-[#1f1f1f]`); no internal cross lines.
- Short last row centered via `col-span-full` + `w-1/2`.

### 3. Show photos immediately (`ReportColorPhoto.tsx`)

- Quiet mode (quote sheet) **renders catalog `src` immediately**, then swaps to the background-removed cutout when ready.
- `data-report-color-photo="pending"` until cutout is ready so PDF/PNG export still waits via `waitForReportColorPhotos`.
- Cutout loader deduplicates in-flight fetches and exposes `getCachedReportColorPhotoCutout` to skip loading flashes on cache hits.

### 4. `QuoteSheet` wiring

- Color grid overlay uses `QuoteColorGrid` with `compact` + `quiet` (not `photosOnly` / `frameless`).
- Overlay div keeps explicit `left/top/width/height` from `view.colorGrid` and `overflow-hidden`.

## Why This Works

- **Height chain**: `minmax(0, 1fr)` grid rows + `overflow-hidden` + `max-h-full` on images constrains photos to the slot Excel allocates (~170px tall in typical sheets).
- **Immediate `src`**: users see label and photo together; cutout is a visual upgrade, not a prerequisite for layout.
- **Single layout source**: shared `colorGridRows` keeps on-screen grid, tests, and Word composite aligned.
- **Dealer alignment**: 2-column centered grid with side labels matches the Mitsubishi quote template wireframe.

## Prevention

- After quote UI changes, verify with browser test on a saved quote (4+ colors): labels + photos visible, no overflow, no “+” borders.
- When using `npm start`, run `npm run build -w @onroad/frontend` and restart — hot reload does not apply to production start.
- Do not reintroduce a frontend copy of `colorGridLayout.ts`; extend `@onroad/shared` only.
- When changing quiet photo behavior, keep `data-report-color-photo` pending/ready semantics for PDF export.
- Add or update tests in `apps/frontend/src/features/quote/lib/colorGridLayout.test.ts` when row counts change (include `colorGridRows(3)` → `[[0,1],[2]]`).

## Related Issues

- Contract docs: `apps/frontend/src/features/shared/components/AGENTS.md`, `apps/backend/src/server/assets/quote-report/AGENTS.md`
- Layout tests: `apps/frontend/src/features/quote/lib/colorGridLayout.test.ts`
