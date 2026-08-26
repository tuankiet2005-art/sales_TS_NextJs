# Pages

## Purpose

Route-level screens for brand pick, catalog search, vehicle confirm, and on-road quote.

## Ownership

- `BrandPortal.tsx` — `/`; each ready brand box is a full-card link (photo included)
- `HomePage.tsx` — `/brand/:brandCode`; compact viewport-fitted catalog on `lg+` (search/filters toolbar + flex grid shows all models without scrolling); category/model/type filters live in URL query (`?category=&model=&type=&page=`); one paginated **model-line** fetch per filter change; aborts stale requests
- `ModelPage.tsx` — `/brand/:brandCode/models/:modelSlug`; hero (model + price) → compact trim/year bar (pick trim first, then years for that trim) → image + specs left, sticky confirm form right
- `VehiclePage.tsx` — legacy `/brand/:brandCode/vehicles/:vehicleId` redirects to `ModelPage` with trim pre-selected
- `OnRoadQuotePage.tsx` — load extras, single `POST /api/quote-load` for vehicle + breakdown, equal left Price / right Accessories, sheet, Excel + PDF export
- `AdminDataPage.tsx` — `/admin` easy forms; **admin role only** (sales operators see a forbidden message); left sidebar groups **Dữ liệu xe** and **Nhân sự** with expandable sub-lists (no top tab row); catalog and plate lists have live soft search plus tab-specific dropdown filters (vehicles: brand, category, body style, status; locations: region, fee zone; dealers/fee rules: brand or category). Catalog tables paginate client-side (10 rows per page). **Phụ kiện xe** tab edits accessory catalog (multilingual name, price, WebP photo stored in DB). **Bank loans** tab uses `BankLoanForm` with searchable bank and consultant pickers; manage reference data on **Banks** and **Consulting staff** tabs. Tab switches load only that tab’s list plus lookups the tab needs; `lib/adminCatalogCache.ts` deduplicates concurrent and repeat fetches until save/delete on that tab
- App-wide login: `LoginScreen` via `AppShell`; pages render only after sign-in; reload with a token must not flash login
- Page titles stand alone — no lead/tagline under the title
- `QuoteHistoryPage.tsx` — `/quotes` server search with pagination (10 per page); brand and province filters; optional `customerId` URL filter from customer CRM; list rows omit `payload` (loaded on open); desktop table rows hover and double-click to open; mobile cards support double-tap to open; the Actions column uses a labeled Open button

## Local Contracts

- Confirm form, usage, and company policies stay on `VehiclePage`; totals and export live on `OnRoadQuotePage`
- On-road query: `locationId` (required), `categoryId`, `optional`, `name`, `address`, `street`, `customerId`, `color`, `usage`
- Policy choices persist in `sessionStorage` key `onroad-policy-{vehicleId}`
- `OnRoadQuotePage` keeps customer picker state (`customerId` when linked) so export attaches quotes to the customer record
- Quote extras (`lib/quoteExtras.ts`): `Giảm giá` seeds from `extrasFromQuote(vehicle, breakdown)` so the adjustable panel matches confirm-page / sheet discount; `VehiclePage` saves policy discount in session before navigating. **Bank loan** (`QuoteBankLoanPanel` + `extras.bankLoan`) drives the sheet’s bank column, monthly plan, and TVBH line; defaults from `lib/quoteBankLoan.ts`
- Recalculate sits at the bottom of the Price column; **Vay ngân hàng** (`QuoteBankLoanPanel`) sits between Price/Accessories and `QuoteSheet` (always visible; shows setup hint when catalog is empty); Excel and PDF sit below `QuoteSheet`
- Excel and PDF persist one `quote_history` row: a calculated quote, reused for the same customer and vehicle within two minutes. Incomplete stubs (no vehicle / 0 đ) stay hidden. History **Mở** uses a pointer cursor
- Excel download uses the vehicle’s `quote_sheet_name` tab inside `bang-bao-gia.xlsx` (Attrage opens Attrage, not Xpander MT)
- Header language (`vi` / `en` / `zh` / `ja`) drives the whole UI, including `/admin` tables, quote sheet, and Excel/PDF. Location rows use `name` / `nameEn` / `nameZh` / `nameJa`; categories and fees use `category.*` / `fee.*` keys; plate provinces reuse location names
- Admin multilingual fields: type Vietnamese first; leaving the box calls `POST /api/admin/translate` and fills empty `en` / `zh` / `ja`. Save also fills copies of Vietnamese. Manual edits to those languages are kept
- Add/edit catalog rows open in a `CenteredModal` popup (viewport-centered, above nav), not under the table; catalog table rows use shared `list-data-row` hover and double-click to edit (same as the Edit button). The Actions column uses labeled Edit and Delete buttons, not icons
- Each vehicle color can have multiple photos in `colorPhotos` (JSON array per color). Admin **Màu xe và ảnh** supports multi-upload, reorder, and remove per color. Upload converts to WebP in the browser first, then the API re-encodes with Sharp and saves the blob in the database. Quote and confirm pages use the first photo per color for thumbnails
- Fee policy, dealer policy, and plate regions save through `/api/admin` and persist in `app_settings`
- Fee rules tab lists only remaining rule-based fees (one row per fee + vehicle type). `LICENSE_PLATE` and `REGISTRATION_TAX` stay on their own tabs
- License plate fees tab uses a 6 / 4 split (Area I vs Area II, and province name vs area)

## Work Guidance

- Show the real API error under the generic `apiError` banner
- Async page loads and reloads use `components/LoadingState.tsx` (spinner, skeletons, `PageLoadingScreen`) instead of plain text placeholders
- After extras change, user must Recalculate before the sheet updates

## Verification

- Manual walk of brand → vehicle (details + policies) → quote with a Mitsubishi id from Neon

## Child DOX Index

- No child AGENTS.md files under this folder.
