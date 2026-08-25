---
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
status: implemented
---

# Vehicle model year variants — Plan

## Goal Capsule

**Objective:** One catalog card per **model line** (e.g. Xpander). Customers open it, pick a **model year**, then pick a **trim** for that year. Each year+trim keeps its own price, colors, and photos. Quotes still bind to one concrete vehicle row.

**Product authority:** User chose model-level grouping (not trim-level).

**Open blockers:** None for requirements; implementation sequencing is for `ce-plan`.

---

## Product Contract

### Problem

Today each `vehicles` row is one catalog card (`VehicleCard` → `/brand/:brandCode/vehicles/:id`). The same model line with multiple years (2024, 2025, 2026) appears as duplicate cards or scatters trims across the grid. Year is a single field on one row; there is no way to browse “Xpander” and switch year without knowing internal IDs.

### Actors

- **Customer / sales operator:** browse catalog, confirm vehicle, quote.
- **Admin:** add/edit vehicles in `/admin` Data tab.

### Key decisions

| ID | Decision |
|---|---|
| KTD-1 | **Grouping unit = model line** (`vehicles.model` within a brand), not trim name. |
| KTD-2 | **Sellable SKU stays one DB row** per `(brand, model, trim name, model_year)` — no merge of prices or photos across years. |
| KTD-3 | **Quote/history contract unchanged:** `vehicleId` remains the year+trim row; year switch on UI navigates to the matching row id. |
| KTD-4 | **Default year on open:** highest active `model_year` for that model (tie-break: highest list price or admin “default year” flag — pick at plan time). |
| KTD-5 | **Inactive year or trim:** hidden from customer year/trim pickers; still editable in admin. |

### User flows

#### Catalog (customer)

1. Grid shows **model cards** (one per `brand + model`), not one card per trim/year row.
2. Card displays: model name, category chip, hero image (from default year’s default trim), **“from {min sale price}”** across active variants, optional year range badge (`2024–2026`).
3. Click → **model page** `/brand/:brandCode/models/:modelSlug` (slug derived from `model`, URL-encoded).

#### Model page (customer) — new screen

1. **Year strip** (segmented control): only years that have ≥1 active trim for this model.
2. Changing year updates:
   - trim list (chips or sub-cards),
   - hero slideshow (selected trim’s color photos),
   - price block,
   - specs for selected trim.
3. **Trim picker:** list active trims for `(brand, model, year)` — e.g. Eco, Premium, Cross.
4. **Continue to quote** uses resolved `vehicleId` for the selected year+trim (same confirm fields as today’s `VehiclePage`).

Optional shortcut: deep link `/brand/.../vehicles/:id` still works; page loads that row and pre-selects matching year + trim.

#### Admin — add / edit data

Keep **one admin record = one sellable row** (trim + year). Improve UX around the model line:

1. **Vehicles table:** group visually by `model` (expandable) or add **Model** filter (already exists on catalog; mirror in admin).
2. **Add vehicle form:**
   - Fields unchanged: brand, category, **model**, **name** (trim), **year**, price, colors/photos, specs.
   - New actions:
     - **“Add year for this model”** — copies current draft except `year`, `id`, prices, `colorPhotos`; admin adjusts price/photos for the new year.
     - **“Add trim for this model”** — copies model/category/spec template; new `name`, same or new year.
3. **Validation:** reject duplicate `(brandCode, model, name, year)` on save.
4. **Photos:** each year+trim row owns its own `colorPhotos` / `vehicle_images` (already true); no shared gallery across years.

### Data model (requirements level)

No new table required for v1. Strengthen identity on existing `vehicles`:

- **Natural key:** `(brand_id, model, name, model_year)` unique among active rows.
- **Grouping key for catalog:** `(brand_id, model)`.
- **Optional later:** `vehicles.is_default_year` boolean for marketing default when multiple years tie — not required if “latest year wins” is enough.

Each row continues to own: `list_price`, `sale_price`, `color_photos`, `quote_sheet_name`, specs, gifts, etc.

### API (requirements level)

| Endpoint | Purpose |
|---|---|
| `GET /api/vehicles/models/search?brandCode=&page=` | Paginated **model summaries** for catalog grid (replaces per-row cards on home). |
| `GET /api/vehicles/models/:brandCode/:modelSlug` | Model detail: `{ model, years[], trimsByYear: { [year]: TrimSummary[] } }` + enough fields for cards/slideshow without N+1. |
| `GET /api/vehicles/:id` | Keep; extend with `modelContext: { model, year, availableYears, trimsForYear }` for deep links. |

Admin: `POST/PUT /api/admin/vehicles` gains duplicate-key error for same brand+model+name+year.

### UI components (requirements level)

| Component | Role |
|---|---|
| `ModelCard` | Catalog grid item (replaces per-trim `VehicleCard` on home). |
| `ModelYearPicker` | Segmented year control. |
| `ModelTrimPicker` | Trim list for selected year. |
| `ModelPage` | Composes gallery + price + confirm form (reuse `VehiclePage` sections or merge). |

Reuse `VehicleImageSlideshow`, color picker, customer picker, policy blocks from current `VehiclePage`.

### Non-goals (v1)

- Single shared photo album across all years (each year keeps own pics).
- Merging Excel quote tabs across years (each row keeps `quote_sheet_name`).
- Cross-brand model grouping.
- Automatic price carry-forward when adding a year (admin copies manually or via “Add year” template).

### Acceptance examples

1. Catalog for Mitsubishi shows **one Xpander card**, not separate cards for Eco 2025 and Premium 2026.
2. Open Xpander → years **2024, 2025, 2026** visible → select **2025** → trims **Eco, Cross, …** for 2025 only → select Eco → price and photos match 2025 Eco row.
3. Switch year to **2024** → trim list and prices update; photos differ from 2025.
4. Complete quote → saved history references the **2024 Eco** `vehicleId`.
5. Admin adds **Xpander Eco 2026** via “Add year” from 2025 Eco → new row; appears under Xpander on model page when year 2026 selected.
6. Admin cannot save two rows with same brand + model + name + year.

### Migration / rollout

1. Add unique index `(brand_id, model, name, model_year)` on Neon (dedupe any conflicts first).
2. Ship model search API + `ModelPage` behind feature flag or brand rollout.
3. Switch `HomePage` to model cards.
4. Keep legacy `/vehicles/:id` URLs working indefinitely.

### How this fits the repo

- DB: `vehicles.model`, `vehicles.model_year`, `vehicles.color_photos` already exist (`db/neon-init.sql`, `schema.ts`).
- Catalog: `HomePage` + `VehicleCard` + `searchVehiclesPage` need model aggregation layer.
- Confirm: `VehiclePage` logic moves into or is shared with `ModelPage`.
- Admin: `AdminDataPage` vehicle form + `catalog-admin-service.upsertVehicle` validation.
- Quotes: no payload shape change; `vehicleId` still identifies year+trim row.

---

## Ready for planning

Requirements are complete for `ce-plan` to add implementation units (SQL migration, mappers, routes, pages, admin UX, tests).
