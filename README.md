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

```bash
cd web
cp .env.example .env.local   # set DATABASE_URL (Neon)
npm install
npm run dev
```

Open http://localhost:3000

## Deploy (Vercel)

The Git repo root has no `package.json`. The Next.js app is `web/`.

In the Vercel project: **Settings → General → Root Directory** → set to `web` → Save → **Deployments → Redeploy**.

If Root Directory is empty, `npm install` looks for `/package.json` and fails with `ENOENT`.

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
