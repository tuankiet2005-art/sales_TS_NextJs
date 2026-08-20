# Server database layer

## Purpose

Drizzle schema and Neon client for the OnRoad monolith. Schema mirrors `db/neon-init.sql`; production schema is operator-managed (no auto-migrate).

## Ownership

- `schema.ts` — table definitions
- `client.ts` — `@neondatabase/serverless` + `drizzle-orm/neon-http`
- `repositories/` — read helpers for catalog and `app_settings`

## Local Contracts

- `DATABASE_URL` required at runtime for DB access; accepts `postgresql://` or `jdbc:postgresql://`; wrapping quotes are stripped
- `drizzle.config.ts` is for introspection only — do not run `drizzle-kit push` against Neon production

## Verification

- `npm test` — `schema.test.ts` integration case runs when `DATABASE_URL` is set
