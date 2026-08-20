# Web (Next.js monolith)

## Purpose

Target OnRoad monolith: App Router UI plus `/api` route handlers on Vercel, replacing `frontend/` (Vite) and `backend/` (Spring Boot) after cutover.

## Ownership

- App root: `web/`
- Dev server: port `3000` (`npm run dev`)
- Deploy: Vercel project **Root Directory** must be `web` (Settings → General). Empty root makes `npm install` look for `/package.json` and fail with `ENOENT`
- Migration plan: `docs/plans/2026-08-20-001-refactor-nextjs-monolith-plan.md`

## Local Contracts

### Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- `lucide-react` for icons (shadcn icon set)
- Database: Neon Postgres via Drizzle (`src/server/db/`)

### Environment

Copy `web/.env.example` to `web/.env.local`. Never commit `.env.local`. Quote `ADMIN_PASSWORD` (`"Admin!!@"`) — unquoted `!` breaks bash `source`. Do not `source` `.env.local` in a shell. Production login reads Vercel env, not this file; after changing Vercel env, redeploy.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Operator login for `/api/admin/**` |
| `ADMIN_TOKEN_SECRET` | HMAC secret for admin bearer token |

### API

Same `/api/*` contract as `backend/AGENTS.md` and `frontend/src/api/client.ts`. During migration, `backend/` remains the parity reference.

## Work Guidance

- Fee math in `src/server/domain/`; route handlers stay thin
- Public catalog list/detail prices use dealer policy (`privateDiscountPercent`) via `mapVehicleSummaryWithPolicy`, not legacy `vehicles.discount_amount` columns
- Use `runtime = 'nodejs'` on Excel export and heavy DB routes
- Catalog list GETs (`/api/brands`, `/api/vehicle-categories`, `/api/locations`, `/api/dealer-policy`, `/api/catalog`, `/api/vehicles/search`, `/api/vehicles/[id]`, `/api/brands/[code]`) send `Cache-Control: public, max-age=60` except categories and locations use `max-age=3600, stale-while-revalidate=86400`. Brands, categories, locations, and brand-by-code also cache in `catalog-service` until `invalidateCatalogCache()` from catalog admin writes
- Home catalog loads categories on a fast path (`sessionStorage` + `/api/vehicle-categories`) so filter chips render before the vehicle list finishes; vehicles load via paginated `GET /api/vehicles/search?page=&pageSize=10` (10 per page) with server-side filters
- Catalog vehicle **list** queries select only card fields (no `specifications`, `color_photos`, `gifts` blobs); detail still loads full row on `GET /api/vehicles/[id]`
- Vehicle confirm saves `VehicleDetail` to `sessionStorage` (`lib/vehicleCache.ts`); quote page uses cached vehicle + `POST /api/calculate-on-road-cost` when cache exists, else `POST /api/quote-load`
- Quote export/save accept optional client `breakdown` to skip redundant `calculateOnRoad` when `vehicleId` matches (`resolveQuoteCalculation`)
- Excel export fills `src/server/assets/bang-bao-gia.xlsx` by labels on `vehicles.quote_sheet_name` (never hardcoded cells on sheet 0); unused tabs stay hidden
- PDF export (`src/lib/exportQuotePdf.ts`) inlines computed styles and strips stylesheets so html2canvas 1.4.1 does not parse Tailwind v4 `oklch`/`lab` (canvas pixel sampling converts modern color functions to `rgb`/`rgba`)
- Default UI language Vietnamese (`vi`); match `frontend/src/i18n/` behavior when UI is ported
- Layout is mobile-first: phones stack, tablets use two columns where the contract needs them, desktop keeps the wide catalog
- UI motion is CSS-first (`globals.css` + `lib/motion.ts` + `PageMotion`); no animation library; keep transitions smooth and respect `prefers-reduced-motion`
- Quote page: Price left and Accessories right are equal columns from `md` up; they stack on phones. The Excel quote sheet stays desktop-width and scrolls sideways on small screens
- Header: compact bar + hamburger below `lg`; language switcher stays on the bar
- Do not add the full shadcn component kit unless asked

## Verification

- `npm run build` from `web/` — TypeScript skips `*.test.ts` (`tsconfig.json` exclude); Vitest still runs them
- `npm test` from `web/` — policy loaders (`src/server/config/policy.test.ts`), domain fee math (`src/server/domain/*.test.ts`), Excel fill (`src/server/services/quote-sheet-fill.test.ts`), quote history reuse (`src/server/services/quote-history-rules.test.ts`), PDF color rewrite (`src/lib/cssColor.test.ts`), vehicle image import (`src/server/catalog/vehicle-import.test.ts`); optional Neon integration in `src/server/db/schema.test.ts` when `DATABASE_URL` is set
- `npm run import:catalog` — operator import from registration-photo folder; optional `--dry-run` or `--source <path>`

## Child DOX Index

| Path | Scope |
|---|---|
| `src/server/db/AGENTS.md` | Drizzle schema, Neon client, catalog repositories |
| `src/server/catalog/` | Registration-photo import (`npm run import:catalog`); WebP blobs in `vehicle_images` table |
| `src/server/config/AGENTS.md` | YAML policy defaults, `app_settings` overrides |
| `src/server/domain/AGENTS.md` | Fee rule resolution, dealer pricing, on-road cost assembly |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
