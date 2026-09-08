# Concepts

> Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Quote sheet

### Quote sheet
The rendered on-road price table shown on the quote page and used as the source for Excel, Word, PDF, and PNG exports. Layout positions come from the dealer Excel template; dynamic overlays (such as vehicle color photos) are composited on top in the browser.

### CÁC MÀU XE (color grid)
The merged table cell below the **CÁC MÀU XE** header where available paint colors are shown. OnRoad replaces template placeholder images with a live grid of color photos and paint-code labels.

### Color grid overlay
The absolute-positioned region (`view.colorGrid` in the quote sheet view model) where `QuoteColorGrid` renders. Its pixel box is parsed from the Excel template merge area; photos must fit inside this box without overflowing.

### Report color photo
A catalog vehicle color image processed for the quote sheet: background removed for a clean cutout on white. The UI shows the original catalog image immediately, then swaps to the cutout when ready; exports wait until cutout status is `ready`.
