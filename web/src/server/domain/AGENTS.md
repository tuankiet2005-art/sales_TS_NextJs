# Domain (fee calculation)

## Purpose

Pure TypeScript port of Spring `OnRoadCostService`, `FeeRuleResolver`, `FeeAmountCalculator`, and `DealerPolicy` — no HTTP or DB in this folder.

## Ownership

- Fee rule matching: `fee-rule-resolver.ts`
- Rule amount math: `fee-amount-calculator.ts`
- Dealer discount/offers: `dealer-policy.ts`
- Quote assembly: `on-road-cost.ts`
- Shared types: `types.ts`, `money.ts`

## Local Contracts

- Policy-owned fees (`REGISTRATION_TAX`, `LICENSE_PLATE`) delegate to `src/server/config/fee-policy.ts`
- `calculateOnRoadCost(input, context)` expects caller to load definitions, rules, and policy records (U5 API layer)

## Verification

- `npm test` from `web/` — `src/server/domain/*.test.ts`

## Child DOX Index

| Path | Scope |
|---|---|
| *(none)* | |
