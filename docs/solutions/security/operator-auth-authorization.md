# Operator authentication and authorization

## Problem

The UI required sign-in, but quote, calculate, export, and quote-history APIs accepted anonymous requests. All signed-in users shared one admin capability with no role separation.

## Solution

1. **Role-aware HMAC tokens** — login returns `{ token, username, role }` where `role` is `admin` or `sales`. Token signs `username:password:role`.
2. **Server guards** — `requireOperator` on quote/calculate/export routes; `requireAdmin` (403 for sales) on `/api/admin/**`.
3. **Client** — bearer token sent on all non-public API paths; role stored in `localStorage` for UI authorization.
4. **UI** — `/admin` nav and page hidden/blocked for `sales` role.

## Env

| Variable | Role |
|---|---|
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` — full access |
| `OPERATOR_USERNAME` / `OPERATOR_PASSWORD` | optional `sales` — quotes only |

When `OPERATOR_*` is unset, only the admin account exists (previous single-operator setup).

## Public APIs (no token)

`/api/health`, `/api/brands/**`, `/api/vehicles/**`, `/api/vehicle-categories`, `/api/locations`, `/api/dealer-policy`, `/api/catalog`, `/api/vehicle-images/**`

## Notes

- Existing sessions invalidate when token format changes — operators re-login once.
- Catalog GETs stay public to preserve `Cache-Control` reference-data caching.
