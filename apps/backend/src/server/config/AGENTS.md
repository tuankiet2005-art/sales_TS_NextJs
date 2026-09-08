# Server policy config

## Purpose

Load fee, dealer, and license-plate policies from YAML defaults with `app_settings` overrides (same keys as Spring `PolicyAdminService`).

## Ownership

- `data/*.yml` — copied defaults from `backend/src/main/resources/`
- `yaml-defaults.ts` — parse YAML into typed records
- `policy-store.ts` — merge DB overrides, cache snapshot
- `fee-policy.ts` — registration tax and plate fee helpers

## Local Contracts

| `app_settings` key | YAML source |
|---|---|
| `fee-policy` | `data/fee-policy.yml` |
| `dealer-policy` | `data/dealer-policy.yml` |
| `license-plate-regions` | `data/license-plate-regions.yml` |

## Verification

- `npm test` — `policy.test.ts`
