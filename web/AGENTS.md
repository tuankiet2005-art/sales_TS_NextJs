# Web (Next.js monolith)

## Purpose

Target OnRoad monolith: App Router UI plus `/api` route handlers on Vercel, replacing `frontend/` (Vite) and `backend/` (Spring Boot) after cutover.

## Ownership

- App root: `web/`
- Dev server: port `3000` (`npm run dev`)
- Deploy: new Vercel project, root directory `web`
- Migration plan: `docs/plans/2026-08-20-001-refactor-nextjs-monolith-plan.md`

## Local Contracts

### Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- `lucide-react` for icons (shadcn icon set)
- Database: Neon Postgres via Drizzle (`src/server/db/`)

### Environment

Copy `web/.env.example` to `web/.env.local`. Never commit `.env.local`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Operator login for `/api/admin/**` |
| `ADMIN_TOKEN_SECRET` | HMAC secret for admin bearer token |

### API

Same `/api/*` contract as `backend/AGENTS.md` and `frontend/src/api/client.ts`. During migration, `backend/` remains the parity reference.

## Work Guidance

- Keep fee math in `src/server/domain/`; route handlers stay thin
- Use `runtime = 'nodejs'` on Excel export and heavy DB routes
- Excel export fills `src/server/assets/bang-bao-gia.xlsx` by labels on `vehicles.quote_sheet_name` (never hardcoded cells on sheet 0); unused tabs stay hidden
- PDF export (`src/lib/exportQuotePdf.ts`) inlines computed styles and strips stylesheets so html2canvas 1.4.1 does not parse Tailwind v4 `oklch`
- Default UI language Vietnamese (`vi`); match `frontend/src/i18n/` behavior when UI is ported
- Do not add the full shadcn component kit unless asked

## Verification

- `npm run build` from `web/`
- `npm test` from `web/` — policy loaders (`src/server/config/policy.test.ts`), domain fee math (`src/server/domain/*.test.ts`), Excel fill (`src/server/services/quote-sheet-fill.test.ts`), PDF color rewrite (`src/lib/cssColor.test.ts`); optional Neon integration in `src/server/db/schema.test.ts` when `DATABASE_URL` is set

## Child DOX Index

| Path | Scope |
|---|---|
| `src/server/db/AGENTS.md` | Drizzle schema, Neon client, catalog repositories |
| `src/server/config/AGENTS.md` | YAML policy defaults, `app_settings` overrides |
| `src/server/domain/AGENTS.md` | Fee rule resolution, dealer pricing, on-road cost assembly |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
