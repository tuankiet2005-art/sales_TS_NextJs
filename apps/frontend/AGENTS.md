# Frontend (Next.js UI)

## Purpose

OnRoad operator and customer UI. Talks to the Express backend via `/api/*` rewrites in `next.config.ts`.

## Ownership

- App root: `apps/frontend/`
- Dev server: port `3000` (`npm run dev` from here, or `npm run dev:frontend` from repo root)
- Deploy: Vercel project **Root Directory** = `apps/frontend` (Next.js UI + Express API via `api/index.ts`)

## Local Contracts

### Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- `lucide-react` for icons
- Shared types from `@onroad/shared`

### Environment

Copy `.env.example` to `apps/frontend/.env.local`. Never commit `.env.local`.

| Variable | Purpose |
|---|---|
| `API_URL` | Local dev only — proxy `/api` to Express (`http://localhost:4000`). Omit on Vercel. |

Backend auth and database env live in `apps/backend/.env.local`.

## Work Guidance

- Feature modules under `src/features/` (auth, catalog, quote, customer, admin, shared)
- Default UI language Vietnamese (`vi`)
- Quote page: Price left and Accessories right are equal columns from `md` up
- Money display: `features/shared/lib/format.ts` — `formatVnd` for UI, `formatQuoteAmount` for quote sheet
- Auth: HMAC bearer tokens with roles — `admin` (catalog + quotes) or `sales` (quotes only)
- Favicon: drop an image in `public/brand/favicon-drop/`, then `npm run sync:favicon`

## Verification

- `npm run build` from `apps/frontend/`
- `npm test` from `apps/frontend/`

## Child DOX Index

| Path | Scope |
|---|---|
| `src/features/AGENTS.md` | Feature module layout |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
