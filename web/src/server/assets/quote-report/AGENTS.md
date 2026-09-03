# Quote report template

## Purpose

Dealer quote layout source of truth. The on-screen report, Excel export, PDF, and PNG all render from the `.xlsx` in this folder.

## Ownership

- `bang-bao-gia.xlsx` — signed dealer Excel template with formulas, logos, signature blocks, and a merged car-photo slot
- `bang-bao-gia.docx` — unused legacy Word template from an experiment; do not wire the app to it
- This folder — replace the Excel workbook to change the report; do not restyle `QuoteSheet.tsx` for layout

## Local Contracts

- Fill uses named cells and `{{token}}` placeholders in `quote-sheet-fill.ts`. Do not hardcode layout in app code.
- Header includes Mitsubishi logo and **BẢNG BÁO GIÁ CHI TIẾT**.
- Gifts and fees come from the live quote calculation.
- Bottom merged cell receives a dynamic 1–5 photo grid overlay (`QuoteColorGrid` + `ReportColorPhoto`, `lib/colorGridLayout.ts`) on screen; template car placeholders under **CÁC MÀU XE** are hidden. Word export composites the same layout via `quote-docx-fill.ts`. Excel export uses the template as-is.

## Work Guidance

To change the report: edit `bang-bao-gia.xlsx` (or drop a replacement with the same filename).

## Verification

- `npm test` from `web/` — `quote-sheet-fill.test.ts`
- Quote page: layout matches the Excel template; Excel/PDF/PNG follow the same workbook

## Child DOX Index

- No child AGENTS.md files under this folder.
