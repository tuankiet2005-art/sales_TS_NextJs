# Server modules

## Purpose

Domain-driven backend modules for the OnRoad monolith. Route handlers in `src/app/api/` delegate to these modules.

## Ownership

| Module | Path | Responsibility |
|---|---|---|
| auth | `auth/` | HMAC login, `requireAdmin`, `requireOperator` |
| catalog | `catalog/` | Public catalog reads, admin CRUD, catalog repository |
| quote | `quote/` | Quote history, export, report sheet fill, docx |
| customer | `customer/` | Customer CRUD, relationship discounts |
| policy | `policy/` | Fee/dealer/plate policy admin |
| bank-loan | `bank-loan/` | Banks, consultants, loan presets |
| accessory | `accessory/` | Accessory catalog and images |
| media | `media/` | Vehicle images, report color photos |
| translate | `translate/` | VI→EN/ZH/JA glossary + MyMemory |

## Local Contracts

- Shared HTTP helpers: `server/shared/http.ts`
- DB row → DTO mappers: `server/shared/mappers.ts`
- Fee math stays in `server/domain/` (not in modules)
- Drizzle client/schema: `server/db/`; catalog queries in `modules/catalog/catalog.repository.ts`
- `app_settings` repo stays in `server/db/repositories/app-settings.ts`

## Work Guidance

- Route handlers stay thin: auth guard → parse request → call module service → `json()` response
- Cross-module imports: quote → catalog (read), quote → media (images), accessory → media (webp)
- Avoid circular dependencies between modules

## Child DOX Index

- No child AGENTS.md files under individual modules yet.
