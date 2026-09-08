# Frontend features

## Purpose

Domain-driven UI modules for the OnRoad monolith. Each feature owns its components, views, and client-side lib code.

## Ownership

| Module | Path | Scope |
|---|---|---|
| auth | `auth/` | Login, session gate, bearer token storage |
| catalog | `catalog/` | Brand portal, model search, vehicle confirm |
| quote | `quote/` | On-road quote sheet, export, history, bank loan |
| customer | `customer/` | CRM list, picker, address forms |
| admin | `admin/` | Master data CRUD, catalog cache, VI→EN translation |
| shared | `shared/` | AppShell, Header, Pagination, format/motion utils, API client |

## Local Contracts

- App pages in `src/app/` import views from `features/*/views/`
- Shared widgets live in `features/shared/components/` — not in feature folders
- Cross-feature imports use `@/features/<module>/...` paths
- `types/` and `i18n/` remain at `src/` root (shared across features)

## Work Guidance

- Feature-specific code stays in its module; do not add to `shared/` unless two or more independent features need it
- API calls go through `features/shared/api/client.ts`; feature services can wrap client methods when needed

## Child DOX Index

| Path | Scope |
|---|---|
| `shared/components/AGENTS.md` | Shared chrome and quote widgets |
| `admin/views/AGENTS.md` | Page-level screens (catalog, quote, admin) |
