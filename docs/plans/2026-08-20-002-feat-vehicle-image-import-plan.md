---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
title: Vehicle image catalog import - Plan
date: 2026-08-20
---

## Goal Capsule

**Objective:** Replace the Mitsubishi vehicle catalog with data derived from the operator's registration-image folder (`HÌNH ĐĂNG KÝ XE`), including WebP color photos, Vietnamese-market prices, and specifications.

**Product authority:** Folder is source of truth for which trims and color variants exist; `db/neon-init.sql` seed values remain the reference for VN prices and specs where a trim matches.

**Open blockers:** None — images ship as WebP under `web/public/vehicles/` with URL paths in `vehicles.color_photos` (existing schema; no BLOB column).

## Product Contract

### Requirements

- **R1.** Before import, remove all existing rows from `vehicles` (preserve brands, categories, locations, fees, dealers, `quote_history`).
- **R2.** Walk `Model/Version/*.jpg` (43 images across 5 models); color comes from the filename suffix, not a color subfolder.
- **R3.** Map each image to the correct trim (`vehicles.name`) and Vietnamese color label in `color_photos` and `available_colors`.
- **R4.** Convert every source JPEG to WebP (quality ~85) before persisting catalog references.
- **R5.** Populate list/sale prices and `specifications` from the Vietnamese-market seed in `db/neon-init.sql` for matching trims.
- **R6.** Only trims present in the folder are active in the catalog after import (no Pajero, Xpander MT, Xforce Exceed, Attrage CVT).

### Key decisions

- **K1.** Image bytes live in `public/vehicles/`; DB stores WebP URL paths in `color_photos` JSON — matches current OnRoad architecture and Vercel static hosting.
- **K2.** Re-runnable CLI script (`npm run import:catalog`) for operators; default image root is the Downloads folder path.

### Acceptance examples

- **AE1.** After import, `Xpander Eco` has color photos for Trắng, Đen, Bạc, Nâu pointing at `.webp` URLs.
- **AE2.** `Xforce Ultimate` two-tone colors (`Trắng Đen`, `Vàng Đen`, etc.) resolve in the quote color picker.
- **AE3.** Vehicle count equals trims in the folder (13), not the old 18-row seed.

## Planning Contract

### Key technical decisions

- **KTD1.** Use `sharp` for WebP conversion in a Node import script (`tsx`).
- **KTD2.** Core parsing/mapping in `web/src/server/catalog/` with Vitest coverage for filename → color logic.
- **KTD3.** Static trim catalog module mirrors `neon-init.sql` rows for the 13 imported trims.

## Implementation Units

### U1. Catalog import module

**Goal:** Parse folder hierarchy, map colors from filenames, convert images to WebP.

**Files:** `web/src/server/catalog/vehicle-import.ts`, `web/src/server/catalog/vehicle-import.test.ts`, `web/src/server/catalog/vehicle-seed-data.ts`

**Test scenarios:**
- `TRITON PRE TRẮNG.jpg` under `TRITON/PREMIUM` → color `Trắng`, trim `Triton 4x2 Premium`.
- `XFORCE P2 TRẮNG ĐEN.jpg` under `XFORCE/ULTIMATE` → color `Trắng Đen`.
- `DST  P2 XANH ĐEN.jpg` handles extra whitespace.

### U2. Import CLI and UI colors

**Goal:** Wire script, extend `vehicleColor.ts` for Cam and two-tone paints, add npm script.

**Files:** `web/scripts/import-vehicle-catalog.ts`, `web/package.json`, `web/src/lib/vehicleColor.ts`

### U3. Run import against Neon

**Goal:** Execute import with `DATABASE_URL` from `.env.local`.

**Verification:** Query vehicle count; spot-check `color_photos` for one trim.

## Verification Contract

- `npm test` passes including new color-parsing tests.
- Import script completes without error; 13 vehicles with populated `color_photos`.
- `public/vehicles/**/*.webp` files exist for each source JPEG.

## Definition of Done

- Catalog reflects folder trims only, with WebP color photos and VN seed prices/specs.
- Review and compound docs updated if material findings emerge.
