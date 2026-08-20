---
title: Vehicle catalog import from registration photos
date: 2026-08-20
category: workflow-issues
module: catalog
component: vehicle-import
problem_type: knowledge
tags: [mitsubishi, webp, color-photos, import, neon, vehicle_images]
---

# Vehicle catalog import from registration photos

## Context

OnRoad stores each Mitsubishi trim as one `vehicles` row. Color variants use `available_colors` (comma-separated Vietnamese labels) and `color_photos` JSON (`{ "Trắng": "42" }`) where values are `vehicle_images.id` strings. Binary WebP data lives in `vehicle_images.data` (base64). Operators maintain registration images in a folder shaped `Model/Version/*.jpg` where the color name is the filename suffix (e.g. `TRITON PRE TRẮNG.jpg`).

## Guidance

1. Place JPEGs under `Model/Version/` (no color subfolder required).
2. From `web/`, run `npm run import:catalog` (loads `web/.env.local` for `DATABASE_URL`).
3. Use `npm run import:catalog -- --dry-run` to validate mappings without writing.
4. Use `npm run import:catalog -- --source "/path/to/folder"` for a non-default source directory.

The script:

- Ensures `vehicle_images` exists, then deletes all rows in `vehicles` (cascades images; does not touch brands, locations, fees, or `quote_history`).
- Converts each JPEG to WebP (quality 85) and stores blobs in `vehicle_images`.
- Sets `vehicles.color_photos` and `vehicles.image_url` to image IDs; the API serves them at `/api/vehicle-images/{id}`.
- Inserts 13 trims that match the folder, with VN list/sale prices and `specifications` from `vehicle-seed-data.ts` (aligned with `db/neon-init.sql`).

Admin `/admin` vehicle forms accept file uploads for hero and per-color photos; uploads are converted to WebP and saved in `vehicle_images` the same way.

## Why This Matters

Quote and admin UIs read `color_photos` first (`vehicleColor.colorPhoto` → `vehicleImageUrl`). Without import or upload, trims show generic swatches from `public/colors/` instead of real registration photos.

## When to Apply

- New registration photo drops from the dealer.
- Lineup change (add/remove trim folders) — update `vehicle-seed-data.ts` and `vehicle-import.ts` prefix maps if naming conventions change.

## Examples

```bash
cd web
npm run import:catalog -- --dry-run
npm run import:catalog
```

Filename mapping tests live in `src/server/catalog/vehicle-import.test.ts`.
