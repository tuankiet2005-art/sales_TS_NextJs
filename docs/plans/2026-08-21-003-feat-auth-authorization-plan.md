---
title: "Operator authentication and authorization"
date: 2026-08-21
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

# Operator authentication and authorization

## Goal Capsule

**Objective:** Close the gap where the UI requires sign-in but quote/export APIs stay public, and separate sales operators from catalog admins.

**Stop conditions:** Operator APIs reject unauthenticated calls; admin APIs and `/admin` UI require the admin role; tests and build pass.

## Product Contract

### Requirements

- R1. Valid login returns `{ token, username, role }` where `role` is `admin` or `sales`.
- R2. Quote, calculate, quote-load, and export routes require a valid bearer token.
- R3. `/api/admin/**` requires the `admin` role.
- R4. Sales operators can browse catalog and use quote/history flows but cannot open `/admin` or admin APIs.
- R5. Catalog reference GETs stay public for cache parity (`/api/brands`, `/api/vehicles/**`, categories, locations, dealer-policy, catalog, health).

### Key Decisions

- KD1. **Env-based accounts** — `ADMIN_*` for admin role; optional `OPERATOR_*` for sales role. When `OPERATOR_*` is unset, only the admin account exists (current single-operator setup).
- KD2. **Role embedded in HMAC token** — token signs `username:password:role` so password rotation invalidates sessions.

## Implementation Units

### U1. Server auth roles

Extend `admin-auth.ts` with `login`, `resolveSession`, role-aware validation. Add `require-operator.ts` and `forbidden()` helper.

### U2. Protect operator API routes

Add `requireOperator` to quotes, calculate-on-road-cost, quote-load, export-quote.

### U3. Client token + role

Send bearer token on protected API calls; persist role in storage; expose `isAdmin` in auth context.

### U4. UI authorization

Hide admin nav for sales role; block `AdminDataPage` for non-admins.

### U5. Verification

Update auth tests; `npm test` and `npm run build` from `web/`.
