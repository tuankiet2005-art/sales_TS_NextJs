---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
title: List table row interaction - Plan
---

# List table row interaction - Plan

## Goal Capsule

**Objective:** List data pages feel more responsive: desktop table rows show a light theme-based hover highlight, and double-click (or mobile double-tap on cards) triggers the same primary row action as the existing action button.

**Product authority:** OnRoad admin and operator UIs use the existing ink/paper/mist palette (`web/src/app/globals.css`); motion stays CSS-first and respects `prefers-reduced-motion`.

**Execution profile:** CSS utility + thin touch helper + page wiring on two list views. No new dependencies.

**Open blockers:** None.

## Product Contract

**Preservation note:** Product Contract unchanged from brainstorm — planning adds HOW only.

### Summary

Introduce a shared list-row interaction pattern for every **list data table** in the app. Desktop rows get a subtle hover background derived from current theme tokens; double-click on a row opens the row’s primary action (Edit on `/admin`, Open on `/quotes`). Mobile quote-history cards skip hover but support double-tap to Open. Display-only tables (quote sheet, cost breakdown) stay unchanged.

### Problem Frame

Admin catalog tables and quote history list rows today have no hover affordance and require clicking a small action control. Operators scanning long lists lose track of the active row and repeat extra clicks to edit or reopen quotes.

### Key Decisions

- **Shared pattern over page-local CSS** — chosen over duplicating classes on each page: one theme-aligned utility keeps hover consistent as list pages grow. Governs R1, R2.
- **All list data tables** (session-settled: user-directed — chosen over admin-only or admin+quotes without a shared contract: future list pages inherit the same behavior automatically). Governs R1, R3, R4.
- **Mobile cards: double-tap only, no hover** (session-settled: user-directed — chosen over full parity or table-only: touch devices do not benefit from hover highlight; double-tap still speeds the primary action). Governs R5.
- **Primary action per page, not a generic “Edit” label** — quote history double-click/tap triggers Open (same as “Mở”), not admin Edit. Governs R4.

### Requirements

**Interaction**

- R1. Desktop list data table rows (`<tr>` in paginated or filtered entity lists) show a hover background that is a light contrast tint of the active theme (mist or ink-on-paper family), visibly distinct from the default white row but not as strong as selected nav or primary buttons.
- R2. The hover treatment is defined once (shared CSS utility or equivalent) and applied to all list data table rows so new list pages can adopt it without redefining colors.
- R3. Double-clicking anywhere on a list data table row (outside nested controls that stop propagation) triggers that page’s primary row action: admin catalog rows open the existing edit popup with `prepareDraft(row)`; quote history rows call the same `openQuote` path as the Open button.
- R4. Quote history’s row action remains Open quote navigation, not admin Edit — behavior matches the existing Open/Mở control, not a new edit mode.
- R5. On mobile card layouts for list data (quote history phone layout), rows do not show hover highlight; double-tap on the card triggers the same primary action as double-click on the desktop table row.

**Guards and polish**

- R6. Double-click on action buttons inside a row does not fire the row handler twice (buttons use propagation control or equivalent).
- R7. While an admin edit popup is already open, row double-click does not open a second draft or replace the open draft unexpectedly.
- R8. Interactive rows use `cursor-pointer` on desktop so hover reads as clickable.
- R9. Hover color transition, if animated, follows existing motion rules and is disabled or instant under `prefers-reduced-motion`.

**Exclusions**

- R10. Quote sheet (`QuoteSheet`), cost breakdown (`CostBreakdown`), and other display-only tables are not list data pages and do not receive row hover or double-click behavior.

### Key Flows

**F1 — Admin row edit (desktop)**

1. Operator views a catalog tab table on `/admin`.
2. Operator hovers a row → row background shifts to light theme tint.
3. Operator double-clicks the row → edit popup opens with that row’s fields (same as pencil Edit today).
4. Operator saves or cancels → popup closes; table state unchanged except after save refresh.

**F2 — Quote history open (desktop)**

1. Operator views quote list table on `/quotes` (md+).
2. Operator hovers a row → same hover tint as admin.
3. Operator double-clicks the row → navigates to on-road quote with restored extras/policy (same as Open/Mở).

**F3 — Quote history open (mobile card)**

1. Operator views quote cards on `/quotes` (below md).
2. No hover on card.
3. Operator double-taps the card → same navigation as F2.

### Acceptance Examples

- AE1 (admin hover): On `/admin` vehicles tab, hovering any data row shows a visible light mist/ink tint; non-row areas (header, filters) do not change.
- AE2 (admin double-click): Double-clicking a vehicle row opens the edit popup with that vehicle’s data; single-click on pencil still works; double-clicking pencil does not open two popups.
- AE3 (quotes desktop): On `/quotes` desktop table, double-clicking a row opens the quote; behavior matches clicking Open/Mở for the same row.
- AE4 (quotes mobile): On phone, double-tapping a quote card opens the quote; no hover styling appears on cards.
- AE5 (excluded tables): Quote sheet and cost breakdown tables have no row hover or double-click behavior after the change.
- AE6 (reduced motion): With `prefers-reduced-motion: reduce`, row hover still appears but without distracting transition animation.

### Success Criteria

- Operators can identify the hovered row at a glance on admin and quote history desktop tables.
- Double-click/double-tap on list rows is a reliable shortcut for the primary row action on both `/admin` and `/quotes`.
- Hover colors stay within the existing OnRoad theme; no hardcoded off-palette grays.
- No regression to single-click Edit/Open buttons or mobile Open button.

### Scope Boundaries

**In scope**

- `AdminDataPage` catalog tables (all catalog tabs).
- `QuoteHistoryPage` desktop table and mobile cards.
- Shared hover utility and row interaction wiring reusable for future list data pages.

**Deferred for later**

- Single-click row to open/edit (only double-click/tap added).
- Keyboard shortcuts (Enter to edit, etc.).
- Row selection/multi-select state distinct from hover.

**Outside this product’s identity**

- Changing quote sheet or breakdown table presentation.
- Inline editing inside table cells (edit stays in popup/modal).

## Planning Contract

### Key Technical Decisions

- **KTD1:** Add a shared CSS class `.list-data-row` in `web/src/app/globals.css` using `hover:bg-mist/70`, `cursor-pointer`, and `.motion-interactive` transition — mirrors Header nav hover (`hover:bg-mist/70`) rather than inventing a new gray. Governs R1, R2, R8, R9.
- **KTD2:** Desktop double-click uses native `onDoubleClick` on `<tr>`; mobile double-tap uses a small `useDoubleTap` hook in `web/src/lib/` (touch end with ~300ms window) because `dblclick` is unreliable on touch. Governs R3, R5.
- **KTD3:** Row-level handlers call existing page actions (`prepareDraft` + `setDraft` on admin; `openQuote` on quotes) — no new routes or APIs. Governs R3, R4.
- **KTD4:** Action buttons inside rows keep `onDoubleClick` propagation stopped on the button so pencil/Open double-click does not also fire the row handler. Governs R6.
- **KTD5:** Admin row double-click is ignored when `draft` is already non-null. Governs R7.

### Sequencing

1. Shared CSS utility (U1).
2. Double-tap hook (U2) — can parallel with U1.
3. Admin wiring (U3) then quote history wiring (U4) — independent after U1/U2.

### Assumptions

- `hover:bg-mist/70` on white table background provides sufficient contrast (same token as Header inactive nav hover).
- Quote history mobile cards remain `md:hidden` list items; no hover class added to cards per R5.

## Implementation Units

### U1. Shared list-row hover utility

**Goal:** One theme-aligned hover class for all list data table rows.

**Requirements:** R1, R2, R8, R9

**Dependencies:** None

**Files:** `web/src/app/globals.css`

**Approach:**

1. Add `.list-data-row` combining border row styling hook, `cursor-pointer`, `hover:bg-mist/70`, and reuse existing `.motion-interactive` rules for background transition.
2. Ensure `prefers-reduced-motion` block already zeroes `.motion-interactive` transitions (no new animation).

**Patterns to follow:** `web/src/components/Header.tsx` nav hover (`hover:bg-mist/70`); existing `.motion-interactive` in `globals.css`.

**Test scenarios:**

- Test expectation: none — CSS utility; verified manually per AE1 and AE6.

**Verification:** Visual check on admin table row hover; confirm reduced-motion media query leaves hover color instant.

### U2. Double-tap hook for mobile cards

**Goal:** Reliable double-tap detection for quote history mobile cards.

**Requirements:** R5

**Dependencies:** None

**Files:** `web/src/lib/useDoubleTap.ts`, `web/src/lib/useDoubleTap.test.ts`

**Approach:**

1. Export `useDoubleTap(callback)` returning `{ onTouchEnd }` handler.
2. Track last tap timestamp; fire callback when second tap within 300ms on same element.
3. Ignore multi-touch or empty touches.

**Patterns to follow:** Vitest style in `web/src/lib/adminAuth.test.ts`.

**Test scenarios:**

- Two `touchEnd` events within 300ms invoke callback once.
- Two `touchEnd` events separated by >300ms invoke callback zero times.
- Single `touchEnd` does not invoke callback.

**Verification:** `npm test` from `web/` for `useDoubleTap.test.ts`.

### U3. Admin catalog table row interaction

**Goal:** All admin catalog `<tr>` rows hover and double-click to edit.

**Requirements:** R3, R6, R7; governs R1–R2 via U1 class

**Dependencies:** U1

**Files:** `web/src/views/AdminDataPage.tsx`

**Approach:**

1. Add `list-data-row` class to catalog table `<tr>` in the `visibleRows.map` block.
2. Add `onDoubleClick` on `<tr>` that calls existing edit path: reset pending images, `setDraft(prepareDraft(row))` when `draft` is null.
3. On pencil and trash buttons, add `onDoubleClick={(e) => e.stopPropagation()}` (and ensure single-click still works).
4. Do not attach row handler to non-catalog tabs (policy forms have no data table).

**Patterns to follow:** Existing pencil `onClick` at catalog table actions column; modal guard via `draft` state.

**Test scenarios:**

- Covers AE2. Double-click row with no open draft opens edit popup with row data.
- Double-click row while draft open does nothing (R7).
- Double-click pencil does not open duplicate popup (R6).

**Verification:** `npm run build` from `web/`; manual admin vehicles tab hover + double-click.

### U4. Quote history row and card interaction

**Goal:** Desktop table rows and mobile cards open quote on double-click/tap.

**Requirements:** R3, R4, R5; governs R1–R2 via U1 on desktop only

**Dependencies:** U1, U2

**Files:** `web/src/views/QuoteHistoryPage.tsx`

**Approach:**

1. Add `list-data-row` + `onDoubleClick={() => openQuote(row)}` on desktop table `<tr>` (`md:block` table body).
2. Wire mobile `<li>` cards with `useDoubleTap(() => openQuote(row))` — no `list-data-row` class on cards.
3. Add `stopPropagation` on double-click for Open button inside desktop row.
4. Keep existing Open button single-click unchanged.

**Patterns to follow:** Existing `openQuote` and mobile/desktop split in `QuoteHistoryPage.tsx`.

**Test scenarios:**

- Covers AE3. Desktop row double-click navigates same as Open button for row with valid vehicle/brand/location.
- Covers AE4. Mobile card double-tap navigates; card has no hover class.
- Open button double-click does not double-navigate.

**Verification:** `npm run build` from `web/`; manual `/quotes` desktop double-click and mobile double-tap.

## Verification Contract

- `npm run build` from `web/`
- `npm test` from `web/` (U2 hook tests)
- Manual: `/admin` — hover row, double-click edit, pencil still works, no double-popup
- Manual: `/quotes` — desktop double-click opens quote; phone card double-tap opens quote; quote sheet unchanged (AE5)

## Definition of Done

- `.list-data-row` applied to admin catalog tables and quote history desktop table only.
- Double-click/tap triggers primary row action per R3–R5 without regressing single-click buttons.
- R6–R7 guards verified manually on admin.
- Build and tests pass from `web/`.
- `CostBreakdown` and `QuoteSheet` tables untouched (R10).
