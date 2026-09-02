# Quote report template

## Purpose

Dealer quote layout source of truth. The on-screen report, Excel export, PDF, and PNG all render from the `.xlsx` in this folder.

## Ownership

- `bang-bao-gia.xlsx` — signed dealer sheet with `{{PLACEHOLDER}}` tokens, logos, and confirmation blocks
- This folder — replace the workbook to change the report; do not restyle `QuoteSheet.tsx` for layout

## Local Contracts

- Fill is by `{{TOKEN}}` (and leftover label writes). Do not hardcode cell addresses in app code.
- Keep formulas in the workbook (`=B9-B10`, `=SUM(...)`, `=TODAY()`). The web view evaluates them; Excel recalculates on export.
- Header: **A3:G5** title band with Mitsubishi logo overlaid on the left (same row as **BẢNG BÁO GIÁ CHI TIẾT**). Do not add a MOVEO/Meveo logo.
- Row 7 splits customer contact: **A7:C7** địa chỉ, **D7:E7** TVBH, **F7:G7** SĐT (`{{DIA_CHI_KHACH_HANG}}`, `{{TEN_TVBH}}`, `{{SDT_TVBH}}`).
- Gifts / extras: **D13:E13**–**F18:G18** use `{{QUA_TANG_1}}`–`{{QUA_TANG_8}}` only (no baked-in sample text). **D23:E23** label + **F23:G23** value for **TỔNG CP PHÁT SINH**. Empty gift rows collapse in the web view.
- Collapsed spacer rows (height ~2pt): **1–2**, **22**, **24**, **31–32** — no visible gap between totals and payment blocks.
- Signature block rows **40–42**: row **40** labels centered — **A40:B40** TVBH, **D40:G40** customer; rows **41–42** blank signing space below (~78pt each).
- Used range **A3:G42** bordered table only. Rows **1–2** and columns **H+** are not rendered on the web view.
- One workbook is enough for every model. Vehicle name, gifts, fees, and loan figures come from the quote. Optional extra sheets still resolve via `quote_sheet_name`.

## Work Guidance

To change the report: edit `bang-bao-gia.xlsx` (or drop a replacement with the same filename). Keep token names stable unless you also update `quote-sheet-fill.ts`.

Known tokens: `TEN_KHACH_HANG`, `DIA_CHI_KHACH_HANG`, `TEN_TVBH`, `SDT_TVBH`, `DOI_XE`, `GIA_NIEM_YET`, `GIAM_GIA`, `MAU_XE`, `THUE_TRUOC_BA`, `PHI_BAM_BIEN_SO`, `LE_PHI_DANG_KIEM`, `BH_TNDS`, `PHI_DUONG_BO`, `PHI_DICH_VU_DANG_KY`, `QUA_TANG_1`–`QUA_TANG_8`, `TIEN_COC_TM`, `SO_TIEN_VAY_NH`, `THOI_GIAN_VAY`, `SO_THANG_VAY`, `LAI_SUAT_NAM`.

## Verification

- `npm test` from `web/` — `quote-sheet-fill.test.ts`
- Quote page: layout matches the workbook; PNG/PDF/Excel follow the same sheet

## Child DOX Index

- No child AGENTS.md files under this folder.
