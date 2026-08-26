# Components

## Purpose

Shared chrome and quote widgets used by pages.

## Ownership

- `Header.tsx` / `LanguageSwitcher.tsx` / `LoginScreen.tsx` — site chrome; logo stays left with no tagline; nav is hidden until sign-in; after login shows Models, Change brand, History, and Sign out for all roles; **Dữ liệu gốc** (`admin.nav`) nav and `/admin` are admin-only; active nav tab shows a copper border frame; header is `z-50`; `AppShell` must not show `LoginScreen` until the token has been read
- `CenteredModal.tsx` — viewport-centered overlay portaled to `document.body` (`z-[60]`, above header); locks body scroll; use for all edit/create popups
- `ColorPhotoImage.tsx` — vehicle color thumbnail; shows spinner overlay while the selected color image loads from `/api/vehicle-images/{id}` or static `/colors/*`
- `VehicleImageSlideshow.tsx` — per-color photo carousel on `VehiclePage` (prev/next, dots, counter); slides come from the selected color's `colorPhotos` list
- `LoadingState.tsx` — shared spinner, page loading shell, and skeleton placeholders for catalog cards, brand cards, and admin/history tables; use for any async fetch or reload
- `Pagination.tsx` — shared prev/next pager; `DEFAULT_PAGE_SIZE` is 10 rows for catalog, history, customers, and admin tables
- `PageMotion.tsx` — route enter animation keyed by pathname; wraps signed-in pages from `AppShell`
- `QuotePricePanel` / `QuoteAccessoriesPanel` in `QuoteAdjustments.tsx` — equal left/right editors; `PanelHeader` gives icon badge and title the same `h-8` height with centered text
- `QuoteSheet.tsx` — visual replica of the dealer Excel quote; `#quote-sheet` is the PDF source (`lib/exportQuotePdf.ts` sanitizes Tailwind `oklch`/`lab` before html2canvas)
- `VehicleCard.tsx`, `ModelCard.tsx`, `ModelConfigBar.tsx`, `ModelYearPicker.tsx`, `ModelTrimPicker.tsx`, `CostBreakdown.tsx` — catalog / fee list
- `CurrencyInput.tsx` — VND money fields (`formatVnd` on blur, raw digits while editing)
- `ProvincePicker.tsx` — type-to-filter province list; `Ha Noi` matches `Hà Nội`
- `CustomerPicker.tsx` / `CustomerForm.tsx` — searchable customer picker (name + phone) with inline create; profile editor with typed relationships and quote-linked purchase history
- `AddressCombobox.tsx` — street number/name text field above province and district pickers; used on confirm, quote, and customer forms
- `SearchableCombobox.tsx` — generic searchable dropdown (bank and employee pickers in admin bank-loan form)
- `QuoteBankLoanPanel.tsx` — quote-page bank loan settings (bank, rate, term, fixed period, consultant)
- `BankLoanForm.tsx` — validated bank loan editor for admin (bank, monthly rate, term, fixed period, consultant)

## Local Contracts

- Equal two-column split (`lg:grid-cols-2`): Price panel uses a 2-column field grid (`h-12` inputs) plus Recalculate; Accessories catalog on the right
- Accessories the client buys appear in the Accessories column (editable name, amount, labeled Remove button)
- Accessory photos: `aspect-[16/10] object-cover`
- `QuoteSheet` follows `bang-bao-gia.xlsx` (7-column dealer grid, same row order and labels as the template)
- Sheet and export language follow the header switcher (`lib/quoteLabels.ts`); the quote-page selector can still override for one export
- Color-car photos use `h-12 w-auto object-contain` so PDF capture does not stretch them
- Color photos prefer `vehicle.colorPhotos[name]`, then `public/colors/`
- Icons from `lucide-react` only
- Motion tokens in `app/globals.css`; shared helpers in `lib/motion.ts`; honor `prefers-reduced-motion`
- Compact form rows: `.form-fields-row` / `.form-fields-row--auto` / `.form-fields-row--4` / `.form-fields-row--bank-loan-metrics` in `globals.css` — bank loan rate/term/fixed stay narrow; consultant field expands
- Form focus: base-layer inset copper ring in `globals.css` (keeps all four borders visible; avoids clip in scroll modals)

## Work Guidance

- Keep `QuoteAdjustments` exporting both panels so `VehiclePage` and `OnRoadQuotePage` can compose them
- Do not move Export controls into `Header`

## Verification

- Visual check of on-road page: equal Price / Accessories columns, Excel and PDF under the sheet

## Child DOX Index

- No child AGENTS.md files under this folder.
