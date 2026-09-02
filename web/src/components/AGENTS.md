# Components

## Purpose

Shared chrome and quote widgets used by pages.

## Ownership

- `Header.tsx` / `LanguageSwitcher.tsx` / `LoginScreen.tsx` — site chrome; logo stays left with no tagline; nav is hidden until sign-in; after login shows Models, Change brand, History, and Sign out for all roles; **Dữ liệu gốc** (`admin.nav`) nav and `/admin` are admin-only; active nav tab shows a copper border frame; header is `z-50`; `AppShell` must not show `LoginScreen` until the token has been read
- `CenteredModal.tsx` — viewport-centered overlay portaled to `document.body` (`z-[60]`, above header); locks body scroll; use for all edit/create popups
- `ColorPhotoImage.tsx` — vehicle color thumbnail; shows spinner overlay while the selected color image loads from `/api/vehicle-images/{id}` or static `/colors/*`
- `ReportColorPhoto.tsx` — quote-sheet color thumbnail; removes photo background in-browser when the server skips it (Windows dev); PDF/PNG wait for cutouts via `data-report-color-photo`
- `VehicleImageSlideshow.tsx` — per-color photo carousel on `VehiclePage` (prev/next, dots, counter); slides come from the selected color's `colorPhotos` list
- `LoadingState.tsx` — shared spinner, page loading shell, and skeleton placeholders for catalog cards, brand cards, and admin/history tables; use for any async fetch or reload
- `Pagination.tsx` — shared prev/next pager; `DEFAULT_PAGE_SIZE` is 10 rows; pass `compact` for table-footer style (admin tables)
- `PageMotion.tsx` — route enter/exit animation keyed by pathname (`AnimatePresence`); wraps signed-in pages from `AppShell`
- `MotionProvider.tsx` — site-wide `MotionConfig` with `reducedMotion="user"`
- `ShaderGradientBackdrop.tsx` — animated mesh-gradient page backdrop (shadergradient.co–inspired, CSS + Motion)
- `FadeIn.tsx` — `FadeIn`, `StaggerChildren`, `StaggerItem` reveal helpers (reactbits.dev–style entrances)
- `QuotePricePanel` / `QuoteAccessoriesPanel` in `QuoteAdjustments.tsx` — equal left/right editors; `PanelHeader` gives icon badge and title the same `h-8` height with centered text
- `QuoteSheet.tsx` — renders the filled dealer Excel template from `src/server/assets/quote-report/`; scales to the same width as the quote panels above (no horizontal scroll); `#quote-sheet` is the PDF/PNG source
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
- `QuoteSheet` is driven by `bang-bao-gia.xlsx` in `src/server/assets/quote-report/` (layout, labels, colors, logos). The on-screen preview overlays the 2×2 color grid in the template's merged car slot.
- Sheet and export language follow the header switcher (`lib/quoteLabels.ts`); the quote-page selector can still override for one export
- Color-car photos use `max-h-20 w-full object-contain` inside a fixed `h-20` frame so PDF capture does not stretch them
- Color photos prefer `vehicle.colorPhotos[name]`, then `public/colors/`
- Quote sheet **CÁC MÀU XE** uses `QuoteColorGrid` + `ReportColorPhoto` (Excel-style 2×2 grid, paint codes, `GET /api/report-color-photo/[id]`)
- Icons from `lucide-react` only
- Motion: `motion` package + `lib/motionVariants.ts`; `MotionProvider` and `ShaderGradientBackdrop` in root layout; `FadeIn` / `StaggerChildren` for reveals; CSS tokens in `globals.css` and `lib/motion.ts` for simple cases; honor `prefers-reduced-motion`
- Compact form rows: `.form-fields-row` / `.form-fields-row--auto` / `.form-fields-row--4` / `.form-fields-row--bank-loan-metrics` in `globals.css` — bank loan rate/term/fixed stay narrow; consultant field expands
- Form focus: base-layer inset copper ring in `globals.css` (keeps all four borders visible; avoids clip in scroll modals)

## Work Guidance

- Keep `QuoteAdjustments` exporting both panels so `VehiclePage` and `OnRoadQuotePage` can compose them
- Do not move Export controls into `Header`

## Verification

- Visual check of on-road page: equal Price / Accessories columns, Excel, PDF, and PNG under the sheet

## Child DOX Index

- No child AGENTS.md files under this folder.
