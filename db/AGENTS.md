# Database

## Purpose

Operator SQL that creates and seeds the Neon schema for OnRoad.

## Ownership

- `db/neon-init.sql` — source of truth

## Local Contracts

- Safe to re-run: drops demo tables first (`brands`, `vehicle_categories`, `locations`, `dealers`, `fee_definitions`, `vehicles`, `fee_rules`)
- Neon: use the **pooled** host and `sslmode=require`
- Current seed: Mitsubishi Vietnam vehicles, 34 VN locations, fee rules from the Excel “Dữ liệu nguồn”, dealer MITSUBISHI MOVEO NEW CITY (Bình Dương)
- Day-to-day catalog and policy changes use `/admin` after operator login; `app_settings`, `vehicles.color_photos`, and `quote_history` are created automatically if missing. Do not drop `quote_history` when re-running this SQL. Vehicle and accessory images are WebP blobs in `vehicle_images` / `accessory_images`; upload via `/admin`.
- Quote address districts (`location_districts`, 696 former Quận/Huyện): paste `db/add-location-districts.sql` + `db/location-districts-seed.sql` in Neon
- Bank loan tables (`banks`, `consulting_employees`, `bank_loans`): paste `db/add-bank-loans.sql` in Neon on existing databases; fresh installs get them from the end of `neon-init.sql`
- Accessory catalog (`accessories`, `accessory_images`): paste `db/add-accessories.sql` on existing Neon databases; fresh installs include them at the end of `neon-init.sql`
- Customer CRM (`customers`, `customer_relationships`, `quote_history.customer_id`): paste `db/add-customers.sql` on existing Neon databases; fresh installs include them after `quote_history` in `neon-init.sql`
- Customer soft delete (`customers.is_active`): paste `db/add-customer-is-active.sql` on existing Neon databases after customer tables exist; fresh installs include the column in `neon-init.sql`
- Customer permanent/temporary address columns (`permanent_*`, `temporary_*` on `customers`): paste `db/add-customer-addresses.sql` on existing Neon databases after `add-customers.sql`; fresh installs include them in `neon-init.sql`
- Vehicle gallery slideshow (`vehicles.color_photos` as color → image-id arrays): paste `db/add-vehicle-gallery.sql` on existing Neon databases if documenting the JSON shape; fresh installs use array values in `neon-init.sql` import output
- Vehicle model-year identity (`vehicles_brand_model_name_year_uidx`): paste `db/add-vehicle-model-year-unique.sql` on existing Neon databases after customer/vehicle tables exist; fresh installs include the index in `neon-init.sql`
- Consulting employee default flag: paste `db/add-consulting-employee-default.sql` on existing Neon databases after bank-loan tables exist
- Do not re-run this SQL just to add a vehicle
- Thuế trước bạ percents are not in this SQL — edit `/admin` Registration tax (defaults in `fee-policy.yml`)
- Phí bấm biển số is not in this SQL — edit `/admin` License plate fees (defaults in `license-plate-regions.yml`)
- `idx_vehicles_active_brand` partial index on `vehicles(brand_id) WHERE active = TRUE` — speeds catalog search by brand; add manually on existing Neon if not re-running full init

## Work Guidance

- Change schema in this SQL first, then update Drizzle schema in `apps/backend/src/server/db/` to match

## Verification

- After apply: `SELECT COUNT(*) FROM brands;` and `SELECT COUNT(*) FROM vehicles;`
- `GET /api/health` should show `database: UP` and a non-zero `brands` count

## Child DOX Index

- No child AGENTS.md files under this folder.
