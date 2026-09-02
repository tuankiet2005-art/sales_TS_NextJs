---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
title: Quote report template folder - Plan
---

# Quote report template folder - Plan

## Goal

The signed dealer Excel in `web/src/server/assets/quote-report/` is the only layout source for the on-screen quote, Excel export, PDF, and PNG. Replacing that file changes the report.

## Behavior

- Store `Bang_bao_gia_Xpander_Eco(1).xlsx` as `web/src/server/assets/quote-report/bang-bao-gia.xlsx` (`{{placeholders}}` + logos + signature layout).
- Fill tokens from the live quote; keep Excel formulas in the `.xlsx`; evaluate them for the web view.
- Web `#quote-sheet` is a pixel-faithful render of that filled sheet (cells, merges, colors, fonts, borders, header logos).
- Live vehicle color photos overlay the **CÁC MÀU XE** region; template car images in that region are not shown.
- Add PNG export beside Excel and PDF (same capture as PDF).

## Files

- `web/src/server/assets/quote-report/` — template + local AGENTS.md
- `web/src/server/services/quote-sheet-fill.ts` — `{{TOKEN}}` fill
- `web/src/server/services/quote-sheet-model.ts` — worksheet → view JSON
- `web/src/app/api/quote-report/route.ts` — preview (no history write)
- `web/src/components/QuoteSheet.tsx` — render the view
- `web/src/lib/exportQuotePdf.ts` — shared capture + PNG

## Verification

- Fill test: tokens, `B11 = listPrice − discount`, gifts untouched except `{{QUA_TANG_*}}`
- View test: title, color-grid box, header images
- Manual: quote page matches the Excel; PNG downloads
- `npm test` and `npm run build` from `web/`
