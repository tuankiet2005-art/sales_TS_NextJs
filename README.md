# OnRoad — Vehicle Sales & On-Road Cost Platform

Next.js monolith for browsing vehicles and calculating location-based on-road costs in Vietnam.

## Architecture

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| API | Next.js route handlers under `web/src/app/api/` |
| Database | Neon PostgreSQL via Drizzle ORM |

Fee math lives in `web/src/server/domain/`; policy defaults in `web/src/server/config/data/*.yml` with optional `app_settings` overrides.

## Run locally

From the repo root (after `web/.env.local` exists and `npm install` has been run in `web/`):

```bash
npm run dev
# or
npm start
```

Or from `web/`:

```bash
cd web
cp .env.example .env.local   # set DATABASE_URL (Neon)
npm install
npm run dev
```

Open http://localhost:3000

`npm start` in `web/` serves a production build when `.next` is complete; otherwise it starts `next dev`. Production-only: `npm run build && npm start` from `web/`.

## Deploy (Vercel)

The Next.js app is `web/`. Root `package.json` is local convenience scripts only (no Next.js dependency).

In the Vercel project: **Settings → General → Root Directory** → set to `web` → Save → **Deployments → Redeploy**.

If Root Directory is empty, Vercel installs the root scripts package and will not find Next.js.

Set these Vercel env vars (Production + Preview): `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`.

### Database

1. Run `db/neon-init.sql` in the Neon SQL editor.
2. Set `DATABASE_URL` in `web/.env.local`.

## Verification

```bash
cd web
npm test
npm run build
```

## Project layout

```
web/
  src/app/           App Router pages and /api routes
  src/server/db/     Drizzle schema + repositories
  src/server/config/ YAML policy + app_settings overrides
  src/server/domain/ Fee rules, dealer pricing, on-road cost
db/
  neon-init.sql      Schema source of truth
docs/plans/          Migration plan
```
