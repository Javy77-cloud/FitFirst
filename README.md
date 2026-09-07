# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

## Mac test now (`cursor/live-ff-tip-sep7bz`)

Edit Layout opens the **existing** module layout, and the live record form matches it, from `cursor/live-ff-tip-sep7az`. Clicking a layout chip / **Edit Layout** for Leads, Deals, Policies, Contacts, Business, or Carriers loads that module’s **saved** page layout (sections and fields). It does not open a blank new layout when one already exists, and it does not insert a second empty row. The Deal Details form is the Deal layout from Edit Layouts — same for Lead / Contact / Business / Policy / Carrier record forms. Builder UX from the desk tip stays: one layout for all lines, three locked columns, collapsed rows, equal-width type chips, sitewide save toast on Save. Pipeline, Markets, bell, and rail width untouched. No `db:seed`. Ana unbound. Cov A **$321,000**. Tip SHA `2ad1c862`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7bz-8816 && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh. Open a Lead → **Edit Layout** — existing Lead sections/fields appear (not a blank canvas). Same for Deals and at least one other module that already has a layout (Contacts, Business, Policies, or Carriers). Then open that Deal / Lead record: the live form shows the same sections/fields as Edit Layouts. Save a field on Deals in Edit Layouts, reload the Deal — the form matches. Do not bind or edit Ana Cov A (**$321,000**).

### BZ — Open existing layout + live form matches

| # | Check | Pass when |
| --- | --- | --- |
| BZ1 | Open existing | Edit Layout / layout chip for Leads loads the saved Lead layout. Fields/sections are present. Not a blank new layout. |
| BZ2 | Other modules | Same for Deals, Contacts, Business, Policies, and Carriers when a layout already exists. |
| BZ3 | No duplicate | Opening does not wipe the saved layout or create a second empty one. |
| BZ4 | Live Deal | Deal Details shows the same layout Edit Layouts shows for Deals. |
| BZ5 | Live Lead + others | Lead / Contact / Business / Policy / Carrier record forms match that module’s Edit Layouts layout. |
| BZ6 | Scope | Pipeline, Markets, bell, and rail width unchanged. No `db:seed` wipe. Ana unbound. Cov A **$321,000**. |

## Previous tip (`cursor/live-ff-tip-sep7bv`)

Equal-width field-type chips + Edit Layout on every CRM module, from `cursor/live-ff-tip-sep7az`. On the field builder, every palette chip is the **same width** — sized to the longest type label (`Image upload` / `Multi-select`), not `w-max` uneven. **Edit Layout** opens the same builder for **Leads, Deals, Policies, Contacts, Business, and Carriers**. Saves persist per module. Pipeline list, Markets, bell, and Stage colors are untouched. No `db:seed`. Ana unbound. Cov A **$321,000**. Tip SHA `TBD`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7bv-55cb && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh. Open **Settings → Field layouts** — chips in the left palette are one width. From Leads, Deals, Policies, Contacts, Business, or Carriers, click **Edit Layout** and confirm that module’s builder. Save a field on Carriers, then open Leads — layouts stay separate. Do not bind or edit Ana Cov A (**$321,000**).

### BV — Equal chips + Edit Layout everywhere

| # | Check | Pass when |
| --- | --- | --- |
| BV1 | Chips | Field-type chips are equal width, sized to the longest label. Not half-width / uneven `w-max`. |
| BV2 | Entries | Leads, Deals, Policies, Contacts, Business, and Carriers each have a clear **Edit Layout** control. |
| BV3 | Builder | Each entry opens that module’s layout editor (same collapsed-row / menu / DnD builder). |
| BV4 | Persist | Save on one module does not overwrite another module’s layout. |
| BV5 | Scope | Pipeline list, Markets, bell, and Stage colors unchanged. No `db:seed` wipe. |

## Previous tip (`cursor/live-ff-tip-sep7br`)

Header notification badge + unread rows, from latest `cursor/live-ff-tip-sep7az`. The top-bar **bell icon stays normal** — no fill, no terracotta ring. Unread count > 0 shows a **number badge** on the bell; zero unread hides the badge. Open the panel: **unread rows** are highlighted; read rows are not. Mark as read drops the badge and clears that row highlight. In-app only — nothing emails Javy. Global app shell only. No `db:seed`. Ana unbound. Cov A **$321,000**. Tip SHA `87247321`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7br-3688 && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh. Unread alerts → number on the bell, icon otherwise normal. Open the panel — unread rows highlighted. Mark as read — badge drops, row highlight gone. Do not bind or edit Ana Cov A (**$321,000**).

### BR — Unread badge + row highlight

| # | Check | Pass when |
| --- | --- | --- |
| BR1 | Badge | Unread count > 0 → number on the bell. Icon is not filled, ringed, or otherwise highlighted. |
| BR2 | No unread | Zero unread → no badge. |
| BR3 | Panel rows | Open panel: unread rows have a stronger background (`data-unread-row="true"`). Read rows do not. |
| BR4 | Mark read | Mark as read → badge count drops; that row highlight is gone. |
| BR5 | Scope | Header / panel only. Pipeline, builder, Markets, Stage colors unchanged. In-app only. |

## Previous tip (`cursor/live-ff-tip-sep7bq`)

Table Stage colors, `First Last / Lob` deal names, and Settings → Picklists starter catalog, from `cursor/live-ff-tip-sep7az`. **Deals → Pipeline → Table** Stage uses the same colors as Board (Gather Info, Meet / Quotes, Quote Sent, Closed Won, Archive, …) on a compact inline `DealStageSelect` (`text-xs` / `h-7` — table only; Board pills stay). Deal titles are **First Last / Lob** — `Javier Canales / Home` — one slash only. Existing deals retitle via additive migrate `0088_stage_title_picklists` + boot backfill. **Settings → Picklists** seeds US states, lines of business, and common carriers so **Use a global list** on a picklist field has lists to choose. No `db:seed` wipe. Ana unbound. Cov A **$321,000**. Tip SHA `221dd224`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7bq-6666 && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals → Pipeline → Table**. Stage cells should match Board colors. Deal names should read `First Last / Lob`. Open **Settings → Picklists** — US states, lines of business, and common carriers are there; **Use a global list** on a picklist field lists them. Do not bind or edit Ana Cov A (**$321,000**).

### BQ — Stage colors, First Last / Lob, picklists

| # | Check | Pass when |
| --- | --- | --- |
| BQ1 | Table Stage colors | Deals → Pipeline → Table Stage uses the same colors as Board for Gather Info, Meet / Quotes, Quote Sent, Closed Won, Archive. Control is compact (`text-xs` / `h-7`). Inline stage edit still works. |
| BQ2 | Deal name | New / convert / LOB change titles as `Javier Canales / Home` — one slash, no slash between first and last. |
| BQ3 | Existing titles | Prior `First / Last / Lob` and shop leftovers retitle. Ana may become **Ana Dib / Home**; still unbound, Cov A **$321,000**. |
| BQ4 | Picklists | Settings → Picklists shows US states, Lines of business, Common carriers. Field builder **Use a global list** lists them. |
| BQ5 | Scope | Field builder layout/columns, Attach/Activity chips, Markets, toasts, hydration, other pages unchanged. No `db:seed` wipe. |

## Previous tip (`cursor/live-ff-tip-sep7bp`)

Hide call / next-action clocks from Pipeline table rows, from `cursor/live-ff-tip-sep7az`. **Deals → Pipeline → Table** no longer shows a ticking `HH:MM:SS` under each deal. Tip SHA `bf6d0c9f`.

## Previous tip (`cursor/live-ff-tip-sep7bi`)

Builder three equal columns, hard 320px rail, Markets truly empty, Quotes blank, from `cursor/live-ff-tip-sep7az` @ `495978c`. **Settings → Deal field builder** is Field types | Left | Right on one row (`grid-cols-3`), every palette chip `w-full`. Deal right rail `data-ff-deal-right-rail` is **exactly 320px** (`w/min/max`, `shrink-0`, `overflow-x-hidden`); Sheet health is `w-full max-w-full` (no 28rem). Left column is `flex-1` into leftover — no 72%. **Markets** stays blank when the active master sheet has no saved values — the page does not run `evaluateDealMarkets` and leftover risk-row / log matches are ignored. After the agent saves sheet values (or adds a carrier / shops), Markets may show. **Quotes** empty is a blank `data-ff-quotes-empty` div, no dashed placeholder. No `db:seed`. Ana unbound. Cov A **$321,000**. Tip SHA `d1a6a702`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7bi-125d && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh. **Settings → Deal field builder**: three equal columns side by side; every field-type chip the same width. Open a deal: right rail is **320px**; Sheet health does not blow it out. **Markets** with no agent add/shop is completely blank (no "In appetite") even if evaluateDeal would have matches. **Quotes** with no rows is blank — no dashed box. Do not bind or edit Ana Cov A (**$321,000**).

### BI — Equal builder, 320 rail, empty Markets/Quotes

| # | Check | Pass when |
| --- | --- | --- |
| BI1 | Builder columns | Settings → Deal field builder is `grid-cols-3` — Field types \| Left \| Right on one row. Palette chips are `w-full` (same width). |
| BI2 | No LOB filters | Field builder has no Homeowners / Auto / Flood clips. One layout for all lines. |
| BI3 | Rail 320 | `data-ff-deal-right-rail` is `w-[320px] min-w-[320px] max-w-[320px]`. Sheet health is not 28rem. Measured 320px. |
| BI4 | Markets empty | Empty master sheet → Markets completely blank. No evaluateDeal, no leftover In appetite. |
| BI5 | Quotes empty | Deal with no quotes: blank `data-ff-quotes-empty`. No placeholder text. |
| BI6 | Tests | `deal-page-sep7bi`, field-builder, manual-markets, and quotes empty assertions cover the lock. |

## Previous tip (`cursor/live-ff-tip-sep7bh`)

Deal naming rule, search, and drop the Contact column, from `cursor/live-ff-tip-sep7az` latest HEAD. Separate crew from toast (bf) and deal-four-fixes (bg). Every deal auto-names **First Last Lob** — `Javier Canales Home`, `Javier Canales Auto`. Applies on convert and on any line-of-business change. Existing titles backfill (additive migrate `0086_deal_titles` + boot rename). No `… - HO shop` leftovers. Deal search matches first name, last name, or line of business. Pipeline / deals table **has no Contact column**; Contact is not required on the deal. Stages, filters, and other columns stay. No `db:seed`. Ana unbound. Cov A **$321,000**. Tip SHA `TBD`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7bh && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh. Convert or create a deal — title is **First Last Home** (or Auto / Flood). Change line of business — title updates. Search **Javier** on Deals / Pipeline and find Javier Canales Home. Confirm the table has no Contact column. Do not bind or edit Ana Cov A (**$321,000**).

### BH — Deal name, search, no Contact column

| # | Check | Pass when |
| --- | --- | --- |
| BH1 | New / convert name | New deals and converts title as `First Last Lob` (`Javier Canales Home`). |
| BH2 | LOB retitle | Changing line of business retitles the deal (`… Home` → `… Auto`). |
| BH3 | Existing titles | Shop leftovers like `Canales - HO shop` / `Ruiz · HO shop` are gone. Ana may become **Ana Dib Home**; still unbound, Cov A **$321,000**. |
| BH4 | Search | Typing `Javier` finds Javier Canales Home. First, last, and LOB fields match even if the title lags. |
| BH5 | No Contact column | Pipeline / deals table has no Contact column. Contact is not required on the deal. |
| BH6 | Scope | Stages, filters, and every other column stay. Deal detail layout otherwise untouched. |
| BH7 | Tests | `deal-title`, convert, columns, and deals-page cover naming, search, and column removal. |

## Previous tip (`cursor/live-ff-tip-sep7bg`)

### BF — Site-wide top-center action toasts

After Save Deal Details / Save sheet (and other wired actions), a **center-top** toast names the action and auto-dismisses in ~2.5s. Shared `ActionToastHost` + `flashAction` / `?flash=`.



Deal page four fixes, from `cursor/live-ff-tip-sep7az` @ `d225fca`. Separate crew from the toast tip. **Markets** with no carriers and no lookup is blank — no "In appetite", no buckets, no placeholder copy. **Documents** drops the Fit to screen / 100% toggle; the master sheet stays locked at **100%** with no zoom UI. Right rail `data-ff-deal-right-rail` is **exactly 320px**. Deal Details **Contact** and **Address** are a 50/50 split. Do not redesign Quotes, field builder, tags, or sidebar nav. No `db:seed`. Ana unbound. Cov A **$321,000**. Tip SHA `aea35cbb`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7bg && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh, open a deal with **no** matches and **no** manual carriers → **Markets** is empty (no "In appetite"). Open **Documents** — there is no Fit / 100% toggle; the sheet is 100%. Confirm the right rail is **320px**. On **Deal Details**, Contact and Address are equal width. Do not bind or edit Ana Cov A (**$321,000**).

### BG — Deal page four fixes

| # | Check | Pass when |
| --- | --- | --- |
| BG1 | Markets empty | Deal → Markets with no carriers and no lookup: completely empty. No "In appetite". `data-ff-markets-empty`. |
| BG2 | Documents 100% | No Fit to screen / 100% toggle. Master sheet locked at 100%. No zoom scroll UI. |
| BG3 | Right rail | `data-ff-deal-right-rail` is `lg:w-[320px] max-w-[320px]`. |
| BG4 | Equal columns | Deal Details Contact + Address are `grid-cols-2` (50/50). |
| BG5 | Tests | `deal-page-sep7bg`, `manual-markets`, `documents-zoom`, and `deal-details-tab` cover empty Markets, no zoom toggle, rail 320, equal columns. |
| BG6 | Scope | Quotes, sidebar nav, field builder, Pipeline, and upload box position are untouched. |

## Previous tip (`cursor/live-ff-tip-sep7be`)

Fit-to-screen, Save sheet, builder redo + Safari `u.map` hotfix, from `cursor/live-ff-tip-sep7az` @ `ea60fa3`. **Fit to screen** on Documents → master sheet scales until there is **no scrollbar** (100% is the only mode that scrolls). **Save sheet** writes every field to the deal's quote sheet and reload returns those values; **Confirm & request quotes** persists the live form first, then shops from the saved sheet. Field builder is **one layout for every deal** — no Homeowners / Auto / Flood clip filters — three locked columns (narrow types, two equal canvases), Section in the palette, drop at the pointer, Save applies globally. Deal page `.map` paths normalize missing columns / sections / fieldKeys / options / matches. No `db:seed`. Ana unbound. Cov A **$321,000**. Tip SHA `fefe1c7`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7be-b909 && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh, open **Ana Dib** (unbound, do not bind). **Documents**: open a long sheet, click **Fit to screen** — zero scroll at any window size; **100%** may scroll. Type sheet values, **Save sheet**, refresh — values return. **Confirm & request quotes** uses those saved values. **Settings → Deal field builder**: no LOB chips; three columns; drag a type onto left/right; Save. Do not bind or edit Ana Cov A (**$321,000**).

### BE — Fit, save sheet, builder redo

| # | Check | Pass when |
| --- | --- | --- |
| BE1 | Fit to screen | Documents master sheet has **zero** vertical/horizontal scroll in Fit mode at any reasonable viewport. 100% may scroll. |
| BE2 | Save sheet | Save writes every field. Reload shows the same values. |
| BE3 | Confirm quotes | Confirm & request quotes reads the **saved** sheet, not stale client state. |
| BE4 | No LOB clips | Settings → Deal field builder has **no** Homeowners / Auto / Flood filters. One layout for all lines. |
| BE5 | Builder columns | Three locked columns; types column shrinks to labels; left/right equal; Section in the palette; drop at point; Save applies globally. |
| BE6 | Tests | `documents-zoom`, `sheet-save`, `field-builder`, `deal-page-sparse-render` cover fit, save/reload, builder, and the `u.map` crash. |
| BE7 | Scope | Upload box, tags, Markets, and sidebar are unchanged. |

## Previous tip (`cursor/live-ff-tip-sep7bb`)

Documents / tags / Markets only, from `cursor/live-ff-tip-sep7az` @ `270eebf` / tip SHA `911111b`. Separate crew from the field-builder tip — do not touch `/settings/field-builder`, Pipeline, Quotes, Deal Details strip, or file-action menus beyond tag color display. Documents tab gets a **Fit to screen / 100%** zoom toggle (default **fit**, PDF-viewer style, session-persisted) so the tab content stays in the viewport. Tags get a color picker on create, an edit control on existing chips, and the chosen color on every chip (deal rail, lists, settings). Markets with no carriers and no lookup is **blank** — no "In appetite", no empty buckets, no placeholder copy. Populated Markets still shows the real appetite / stretch / skip tables. Additive migrate **0084_tag_colors** only — do not `db:seed`. Ana unbound. Cov A **$321,000**. Tip SHA `TBD`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7bb && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh, open **Ana Dib** (unbound, do not bind). **Documents**: toggle Fit to screen / 100% — fit mode should not scroll the tab. **Tags** on the 300px rail: create a tag with a color, then edit the color; confirm the chip color on Deals / Leads / Contacts / Policies lists. **Markets** on a deal with no carriers: the tab is empty (no "In appetite"). Add a carrier or open a deal that already has a lookup — appetite UI returns. Do not bind or edit Ana (Cov A **$321,000**).

### BB — Documents zoom, tag colors, blank Markets

| # | Check | Pass when |
| --- | --- | --- |
| BB1 | Documents zoom | Documents tab has **Fit to screen / 100%**. Fit is the default (PDF-viewer style). Fit mode keeps tab content in the viewport without page scroll. Toggle persists in `sessionStorage` (`ff-docs-zoom`). |
| BB2 | New tag color | Creating a tag shows a **color picker**. The chip uses that color on the deal rail and every list that renders tags. |
| BB3 | Edit tag color | Existing tags have an **edit color** control (chip hover + Settings → Tags → Save color). Color persists on `desk_module_tags.color`. |
| BB4 | Markets empty | Deal → Markets with no carriers and no lookup: **no** "In appetite", **no** empty buckets, **no** placeholder copy. `data-ff-markets-empty`. |
| BB5 | Markets populated | After a lookup or a manual carrier add, appetite / stretch / skip tables still render for buckets that have rows. |
| BB6 | Tests | `documents-zoom`, `tag-colors`, and `manual-markets` cover the toggle, color persist/display, and empty vs populated Markets. |
| BB7 | Scope | Deal Details, Quotes, sidebar, Pipeline chips, and `/settings/field-builder` are untouched. |

## Previous tip (`cursor/live-ff-tip-sep7az`)

Consolidator on `cursor/live-ff-tip-sep7au-2ccf` @ `d0a6eb7` / tip SHA `4f66ea9` (Deal Details + field builder + extract maps 0081/0082). Merge order: (1) `cursor/live-ff-tip-sep7aw-5c80` @ `93bfc72` / tip SHA `f45c790` — Deal Details is Contact + Address + **Edit layout** only, builder off-page; (2) `cursor/live-ff-tip-sep7ax-f547` @ `4e63622` / tip SHA `efed45e` — Documents upload box locked **top / full-width**, never jumps; (3) `cursor/live-ff-tip-sep7av` @ `b6ce8c2` / tip SHA `9c43360` — three-layer learning pipeline + dormant purchase consent. Learning migrate renumbered **0083** so **0081_deal_field_builder** and **0082_document_field_maps** stay. sep7ar chrome stays: AppShell title **Deals**, left `flex-1 lg:w-[72%]`, right aside `lg:w-[300px] max-w-[300px] shrink-0` with quotes-pulled `items-end`, `HardDeleteForm` confirms **once** via `onClickCapture`, Pipeline chip count **78%**. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `911111b`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7az && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open **Ana Dib** on Deal detail (Deal Details tab + 300px rail). Open **Documents** and confirm the upload box stays top / full-width. Also open a shopping deal (not Ana): drop a wind mit / 4-point / dec and confirm the street for enrichment stubs. Purchase consent on `/onboarding/purchase` stays **unchecked**. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AW — Deal Details strip-down

| # | Check | Pass when |
| --- | --- | --- |
| AW1 | Essentials only | Deal Details shows **Contact** (first, last, email, phone) + **Address** (street, city, state, ZIP) + **Edit layout**. No Property / Photos & calc / Notes / New field row. |
| AW2 | Own page | **Edit layout** opens `/settings/field-builder?line=…`. Builder is **not** inline on the deal. |
| AW3 | Builder | Palette of types (single line through image upload). Drag onto a column, drop, type the label. Two columns; drag fields/sections to reorder. Add/relabel sections. **Save** applies to every deal of that LOB. |
| AW4 | Other tabs | Documents, Markets, Quotes, and the 300px rail are unchanged. |
| AW5 | Tests | `deal-details-tab` + `field-builder` cover the stripped desk and the builder open path. |

### AX — Documents upload position

| # | Check | Pass when |
| --- | --- | --- |
| AX1 | Cold open | First click **Documents**: upload box is **top of the tab, full width**. Not a left column. |
| AX2 | Refresh | Hard refresh on Documents: **same** top / full-width position. |
| AX3 | Leave and back | Open Markets (or another tab) then Documents again: **same** position. |
| AX4 | No jump | Upload box does **not** move after first paint. No left→top or top→left shift. |
| AX5 | Structure | `data-ff-deal-upload` is `w-full` first child of `data-ff-deal-docs` (`flex w-full flex-col`). Master sheet is `data-ff-deal-docs-sheet` **below**. No `data-ff-deal-upload-split`. No `lg:grid-cols-`. |

### AV — Learning pipeline + dormant consent

| # | Check | Pass when |
| --- | --- | --- |
| AV1 | Three layers | `src/lib/learning-pipeline/{raw,anonymize,pool}` exist. Raw never exports outside the tenant. Pool is admin-only. |
| AV2 | Consent storage | Record has agency / tenant id, timestamp, terms version. Default opt-out (no row = decline). Checkbox default unchecked. |
| AV3 | Pool gate | `writeAnonymizedToGlobalPool` refuses without consent **and** `LEARNING_POOL_CONSENT_LIVE`. Flag default off. |
| AV4 | LEGAL todos | Onboarding module and anonymization service carry the `TODO(LEGAL)` markers. |
| AV5 | Anonymize tests | PII fields stripped; source label / field type / form version / carrier / mapping kept. |
| AV6 | Additive only | Migrate is **0083_learning_pipeline**. No `db:seed`. Deal / Pipeline chrome stays sep7ar. |

### AT — Field maps + enrichment

| # | Check | Pass when |
| --- | --- | --- |
| AT1 | Wind mit map | OIR-B1-1802 table maps Roof covering / Roof deck attachment / Roof-to-wall / Opening protection / Roof geometry / SWR. Extract uses the map only. |
| AT2 | Four-point map | Age of electrical panel, Year last updated, piping supply, water heater, HVAC year, Actual year built. |
| AT3 | Dec page map | Reasonable HO3 labels (named insured, Cov A–D, deductibles, year built, roof, carrier) → sheet fields. |
| AT4 | Unmapped | Unknown labels stay blank. No invented Cov A / Zestimate. Flagged `needs_review` extract rows. |
| AT5 | Address confirm | Confirming `address1` (or city/state/zip after the street is set) runs the enrichment stub; facts enter CHECK. |
| AT6 | Paid API wall | ATTOM / Estated / Florida Property are stubs. Env key names in `.env.example`. No Zillow or county HTML. |
| AT7 | Tests | `field-maps.test.ts` + `property-enrichment/service.test.ts` — map lookup, unmapped blank, stub smoke. |
| AT8 | Both ship | Field maps + enrichment and Deal Details / field builder both ship here. Sidebar / Pipeline chrome unchanged. |

Accuracy targets: wind mit / four-point maps **95%+** on standardized forms; property API **90%+** on year built / exterior / roof type when a BYO key is present. Remainder → agent review.

## Previous tip (`cursor/live-ff-tip-sep7ar`)

Deal detail layout only, from `cursor/live-ff-tip-sep7aq` @ `e3a87df` / tip SHA `fceea29`. Outer row `flex w-full`: left `flex-1 lg:w-[72%]` (title → tabs → LOB → panels, grow LEFT to close the middle gap), right aside exactly `lg:w-[300px] max-w-[300px] shrink-0` — **do not widen the rail**. Quotes-pulled (`DealMotivation`, max-w 11rem) + sheet health sit **`items-end` / flush to the far RIGHT corner** of that 300px aside. Tags, Quick comms, Record context stay stacked under quotes at original card size. AppShell title **Deals**. `HardDeleteForm` keeps the real server `action` and confirms **once** via `onClickCapture` + `confirmHardDelete` (cancel `preventDefault` / `stopPropagation`). `FileDeleteIcon` has no `name` / `formAction`. No Shopping / Source strip. Pipeline chip count **78%**. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `2cbb5fb`.

### AR — Deal rail widths (sep7ar, locked)

| # | Check | Pass when |
| --- | --- | --- |
| AR1 | Split | Outer row `flex w-full`. Left `flex-1 lg:w-[72%]`. Right `lg:w-[300px] max-w-[300px] shrink-0`. Rail is **not** wider than 300px. |
| AR2 | Quotes corner | Quotes-pulled + sheet health are **`items-end`**, flush to the **far right** of the 300px aside. Not left-aligned / centered in the column. |
| AR3 | Cards under | Tags, Quick comms, Record context stay stacked in that same 300px aside. Original card sizes. No stretch. |
| AR4 | Left grows | Empty middle gap closes by growing the **left** stack (title → tabs → LOB → panels). Not by widening the right rail. |

### AO — Deal detail layout

| # | Check | Pass when |
| --- | --- | --- |
| AO1 | Title left | Deal name is the **page title, top-left**. Not in the tabs toolbar. Not hanging mid/right. |
| AO2 | No right chrome | No **Shopping / Source / Referral** strip on the top-right. Stage · Source · Referral is not a right-side title. |
| AO3 | Flush stack | Left stack, almost no gap: **Deal title** → **Deal Details \| Documents \| Markets \| Quotes** → **Line of business** → panels. Motivation on the right does **not** push tabs down. |
| AO4 | Upload trash | Each uploaded file row still has a **trash can**. **+ Add another document** stays. |
| AO5 | Pipeline locked | Attach / Activity chips stay put except the **78%** count color. |
| AQ1 | Header Deals | Desk header top-left shows **Deals**, then the global search bar. Not blank. Not the long deal name in the header. Deal name stays the in-page `data-ff-deal-title` h1. |
| AQ2 | Right rail | `data-ff-deal-right-rail` is **300px sticky**: Sheet health, then Quotes pulled today, then Tags, Quick comms, Record context. No big empty gap under quotes-pulled. |
| AQ3 | Tabs under title | Left `flex-1 lg:w-[72%]`: deal title → Deal Details \| Documents \| Markets \| Quotes → LOB → panels. No `RecordDetailLayout` rail inside tabs. Motivation does **not** push tabs down. |
| AQ4 | Delete once | Trash asks **Are you sure you want to delete?** exactly **once**, via form `onClickCapture` + `confirmHardDelete`. Form `action` stays the real server action — not a client wrapper. Cancel uses `preventDefault` / `stopPropagation`. `FileDeleteIcon` has no `name` / `formAction`. |

### AH — Pipeline list (sep7ah, locked)

| # | Check | Pass when |
| --- | --- | --- |
| AH1 | Same row | Attach and Today's Activity sit on **one horizontal band**. Activity is **not** stacked under a full-width Attach. |
| AH2 | Activity | To the **right of Attach**, **centered in leftover space**. Same leftover-centering as sep7ad. |
| AH3 | Chips | Soft **rounded 100px** cards. Icon + count + word **inside**: **Phone**, **SMS**, **Task**, **Meeting**, **Training**. 3D depth + hover lift. Not crushed. |
| AI1 | Count | Chip **number only** is **24px** / **500**. |
| AP1 | Count color | Chip **number only** keeps chip hue, one notch darker (`color-mix` 78% `--chip-fg` into `#ffffff`). Not navy, not black. |

## Mac test prior (`cursor/live-ff-tip-sep7au`)

Consolidator: Deal Details + field builder from `cursor/live-ff-tip-sep7as-ae16` @ `e409265` / tip SHA `ce2d72d` plus extraction maps + ATTOM / Estated / FL stubs from `cursor/live-ff-tip-sep7at-6bcc` @ `94b775a` / tip SHA `199ae2e`. sep7ar chrome stays. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `4f66ea9`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7au-2ccf && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

## Mac test prior (`cursor/live-ff-tip-sep7aw`)

Deal Details strip-down + Zoho-style field builder, from `cursor/live-ff-tip-sep7as` @ `e409265` / tip SHA `ce2d72d`. **Deal Details** keeps Contact (first, last, email, phone) + Address (street, city, state, ZIP) and one **Edit layout** button. Property / Photos & calc / Notes / inline add-field are gone. **Edit layout** opens `/settings/field-builder` (not inline). Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `f45c790`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7aw-5c80 && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

## Mac test prior (`cursor/live-ff-tip-sep7ax`)

Tight Documents upload lock only, from `cursor/live-ff-tip-sep7as-ae16` @ `e409265` / tip SHA `ce2d72d`. On **Deals → Documents**, the upload box is **full width at the top of the tab** from the first paint — never a left column, never a post-load jump. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `efed45e`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7ax-f547 && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

## Mac test prior (`cursor/live-ff-tip-sep7av`)

Learning data pipeline only, from `cursor/live-ff-tip-sep7ar` @ `ab7d406` / tip SHA `2cbb5fb`. Three layers: **raw tenant**, **anonymize**, **global pool**. Consent checkbox on `/onboarding/purchase` is **dormant / unchecked**. Global pool writes stay blocked unless a consent record exists **and** `LEARNING_POOL_CONSENT_LIVE` is on (default off). Original tip used migrate `0081_learning_pipeline`; this consolidator ships it as **0083**. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `9c43360`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7av && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

## Mac test prior (`cursor/live-ff-tip-sep7as`)

Deal Details + field builder, from `cursor/live-ff-tip-sep7ar` @ `ab7d406` / tip SHA `2cbb5fb`. Tabs: **Deal Details · Documents · Markets · Quotes**. Details is the lead two-column desk with inline add/delete/relabel. Field builder is its own Settings screen (`/settings/field-builder`) — drag fields between two columns, all Javy types, formula math, image upload, **per-LOB layouts**. Tag chip **× on hover** removes from this deal; **Manage tags** opens the module catalog (rename / merge / delete). Convert is selective — agent checks which lead fields carry. Outer row `flex w-full`: left `flex-1 lg:w-[72%]`, right aside `lg:w-[300px] max-w-[300px] shrink-0` with quotes-pulled `items-end`. AppShell title **Deals**. `HardDeleteForm` confirms **once** via `onClickCapture`. Pipeline chip count **78%**. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `ce2d72d`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7as-ae16 && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open **Ana Dib** on Deal detail. Do not bind or edit Ana (unbound, Cov A **$321,000**).

## Mac test prior (`cursor/live-ff-tip-sep7at`)

Document extraction + property enrichment only, from `cursor/live-ff-tip-sep7ar` @ `ab7d406` / tip SHA `2cbb5fb`. Per-form field maps (wind mit OIR-B1-1802, four-point, dec page, policy scaffold) drive extract: **source label → master sheet field**, no guessing. Unmapped labels stay blank and land in the existing needs-review / yellow CHECK path. Confirming the property address runs ATTOM / Estated / Florida Property **stubs** (BYO `ATTOM_API_KEY` / `ESTATED_API_KEY` / `FLORIDA_PROPERTY_API_KEY`). No Zillow. No county scrape. No Zestimate as Cov A. Sidebar / Pipeline / Deal-details field builder untouched (that work is on `sep7as`). Additive migrate only — do not `db:seed`. Ana unbound. Cov A stays **$321,000**. Tip SHA `199ae2e`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7at-6bcc && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals**, open a shopping deal (not Ana). Drop a wind mit / 4-point / dec; mapped labels fill CHECK cells. Confirm the street to trigger enrichment. Do not bind or edit Ana (unbound, Cov A **$321,000**).

## Mac test prior (`cursor/live-ff-tip-sep7aq`)

Consolidator: Deal layout from `cursor/live-ff-tip-sep7ao` @ `ebef125` / tip SHA `df5e03b` (Deal title top-left, tabs flush above LOB, close top gap) plus Pipeline counter from `cursor/live-ff-tip-sep7ap` @ `fec899f` / tip SHA `9b1ef9a` (`.deal-today-chip-count` **24px** / **500**, `color-mix` 78% `--chip-fg` into `#ffffff`). Feel-pass: desk header **Deals** then search; left `flex-1` is title → tabs → LOB → panels (no rail inside tabs); `data-ff-deal-right-rail` is 300px sticky: Sheet health, Quotes pulled today, Tags, Quick comms, Record context — stacked, no empty gap. `HardDeleteForm` confirms **once inside the form action** before the server call. No StagePill / Source · Referral strip. Pipeline chip count **78%**. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `fceea29`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7aq && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open **Ana Dib** on Deal detail. Do not bind or edit Ana (unbound, Cov A **$321,000**).

## Mac test prior (`cursor/live-ff-tip-sep7ao`)

Deal detail layout only, from `cursor/live-ff-tip-sep7an` @ `1f775c9` / tip SHA `f6603bf`. **Deal title** (`deal.title`) sits **top-left** of the Deal screen (`data-ff-deal-title`). Documents · Markets · Quotes sit **flush under that title**, **right above** Line of business (`DealLineSelector`). Stage / source meta moved to the rail — not hanging on the tabs row right. Middle block pulled up (`-mt-5`). Upload trash + Add another stay. Pipeline Attach/Activity chips **locked**. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `df5e03b`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7ao && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Ana Dib** on Deal detail. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AO — Deal detail layout

| # | Check | Pass when |
| --- | --- | --- |
| AO1 | Title left | Deal name is the **page title, top-left**. Not in the tabs toolbar. Not hanging mid/right. |
| AO2 | No right chrome | Stage / LOB / Source / referral text is **off the tabs row right**. Meta lives under the title or in the rail. |
| AO3 | Flush stack | Top → bottom, minimal gap: **Deal title** → **Documents \| Markets \| Quotes** → **Line of business** → Upload / sheet / Markets / Quotes. No dead band under the shell header. |
| AO4 | Upload trash | Each uploaded file row still has a **trash can**. **+ Add another document** stays. |
| AO5 | Pipeline locked | Attach / Activity chips on Deals / Pipeline are unchanged. |

## Mac test prior (`cursor/live-ff-tip-sep7ap`)

From `cursor/live-ff-tip-sep7an` @ `1f775c9` / tip SHA `f6603bf`. MICRO only: `.deal-today-chip-count` numbers stay **24px** / **500**, chip hue mixed one notch darker into white (`78%` chip-fg into `#ffffff`). Not navy. Not black. Chip size, placement, labels, Attach, Deal detail, and layout do not move. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `9b1ef9a`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7ap && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open **Ana Dib** on Deal detail. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AH — Pipeline list (sep7ah, locked)

| # | Check | Pass when |
| --- | --- | --- |
| AH1 | Same row | Attach and Today's Activity sit on **one horizontal band**. Activity is **not** stacked under a full-width Attach. |
| AH2 | Activity | To the **right of Attach**, **centered in leftover space**. Same leftover-centering as sep7ad. |
| AH3 | Chips | Soft **rounded 100px** cards. Icon + count + word **inside**: **Phone**, **SMS**, **Task**, **Meeting**, **Training**. 3D depth + hover lift. Not crushed. |
| AI1 | Count | Chip **number only** is **24px** / **500**. |
| AP1 | Count color | Chip **number only** keeps chip hue, one notch darker (`color-mix` 78% `--chip-fg` into `#ffffff`). Not navy, not black. |

## Mac test prior (`cursor/live-ff-tip-sep7an`)

Consolidator: Pipeline from `cursor/live-ff-tip-sep7am` @ `4cb5a00` / tip SHA `8ac20e6` (`.deal-today-chip-count` **24px** / **500**, soft chip-fg mix into white) plus Deal detail from `cursor/live-ff-tip-sep7ak` @ `042632b` / tip SHA `b5cf1a3` (upload trash on every row + Add another, tabs flush under deal header). Pipeline attach/activity/chip CSS and JSX stay **exactly** sep7am. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `f6603bf`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7an && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open **Ana Dib** on Deal detail. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AH — Pipeline list (sep7ah, locked)

| # | Check | Pass when |
| --- | --- | --- |
| AH1 | Same row | Attach and Today's Activity sit on **one horizontal band**. Activity is **not** stacked under a full-width Attach. |
| AH2 | Activity | To the **right of Attach**, **centered in leftover space**. Same leftover-centering as sep7ad. |
| AH3 | Chips | Soft **rounded 100px** cards. Icon + count + word **inside**: **Phone**, **SMS**, **Task**, **Meeting**, **Training**. 3D depth + hover lift. Not crushed. |
| AI1 | Count | Chip **number only** is **24px** / **500**. |
| AM1 | Count color | Chip **number only** keeps chip hue, softer (`color-mix` 55% `--chip-fg` into `#ffffff`). Not navy, not black. |

### AK — Deal detail

| # | Check | Pass when |
| --- | --- | --- |
| AK1 | Upload trash | Each uploaded file is its own row with a **trash can on the right**. Click removes that file from the deal. **+ Add another document** stays under the last row. |
| AK2 | Tabs flush | Documents · Markets · Quotes sit **flush under the deal header**. No empty band between the header and the first tab. |

### AG — Deal detail

| # | Check | Pass when |
| --- | --- | --- |
| AG1 | One button | Documents has **no** separate **Confirm sheet** button. One checkbox: **I visually reviewed this master sheet.** The only action is **Confirm & request quotes**, disabled until the box is ticked. One click confirms the sheet and requests quotes from every in-appetite carrier. |
| AG2 | Tabs flush | Documents · Markets · Quotes sit **flush under the deal header**. No empty band between the name and the first tab. |
| AG3 | No Quotes folder | Sidebar **Deals** has **no** nested Quotes child. No dead `/deals/quotes` link. Quotes lives only as the Deal detail tab. Customize can still add the catalog Quotes row; it is not a default Deals subfolder. |

### AB — Deal detail

| # | Check | Pass when |
| --- | --- | --- |
| AB1 | Vehicle blocks | Auto master sheet opens with **Vehicle 1** (VIN, year, make, model, usage, garaging ZIP, address). Vehicle 2 is not alone. **+ Add vehicle** under the last block. Personal lines cap at **five**. Commercial Auto is unlimited. |
| AB2 | Driver blocks | **Driver 1** by default. **+ Add driver** grows the list. Same personal / commercial cap as vehicles. |
| AB3 | Upload rows | Each document is its own row with a trash can. **+ Add another document** under the last row. Filename is **plain text**, not a button. |
| AB4 | Tabs flush | Documents · Markets · Quotes sit **flush under the deal header**. No empty band between the name and the first tab. |

### AB — Tags + 8x8

| # | Check | Pass when |
| --- | --- | --- |
| AB5 | Sheet tags | Lead, Contact, Policy, and Deal data sheets show **Tags** with suggested defaults. Agents can add their own. Lead tags that make sense (referral, custom) carry onto the Contact at convert / bind. |
| AB6 | List tags | Leads, Contacts, Deals, and Policies table rows show the same tags. |
| AB7 | 8x8 | Settings → Integrations → Phone / SMS lists **8x8** as a Phone and SMS provider, next to the **Mac Continuity** on/off toggle. |

## Mac test prior (`cursor/live-ff-tip-sep7am`)

From `cursor/live-ff-tip-sep7al` @ `f55f730` / tip SHA `e12eac9`. MICRO only: `.deal-today-chip-count` numbers are **24px** / **500**, chip hue mixed soft into white (`55%` chip-fg into `#ffffff`). Not navy. Not black. Chip size, placement, labels, Attach, Deal detail, and layout do not move. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `8ac20e6`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7am && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open **Ana Dib** on Deal detail. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AH — Pipeline list (sep7ah, locked)

| # | Check | Pass when |
| --- | --- | --- |
| AH1 | Same row | Attach and Today's Activity sit on **one horizontal band**. Activity is **not** stacked under a full-width Attach. |
| AH2 | Activity | To the **right of Attach**, **centered in leftover space**. Same leftover-centering as sep7ad. |
| AH3 | Chips | Soft **rounded 100px** cards. Icon + count + word **inside**: **Phone**, **SMS**, **Task**, **Meeting**, **Training**. 3D depth + hover lift. Not crushed. |
| AI1 | Count | Chip **number only** is **24px** / **500**. |
| AM1 | Count color | Chip **number only** keeps chip hue, softer (`color-mix` 55% `--chip-fg` into `#ffffff`). Not navy, not black. |

### AG — Deal detail

| # | Check | Pass when |
| --- | --- | --- |
| AG1 | One button | Documents has **no** separate **Confirm sheet** button. One checkbox: **I visually reviewed this master sheet.** The only action is **Confirm & request quotes**, disabled until the box is ticked. One click confirms the sheet and requests quotes from every in-appetite carrier. |
| AG2 | Tabs flush | Documents · Markets · Quotes sit **flush under the deal header**. No empty band between the name and the first tab. |
| AG3 | No Quotes folder | Sidebar **Deals** has **no** nested Quotes child. No dead `/deals/quotes` link. Quotes lives only as the Deal detail tab. Customize can still add the catalog Quotes row; it is not a default Deals subfolder. |

### AB — Deal detail

| # | Check | Pass when |
| --- | --- | --- |
| AB1 | Vehicle blocks | Auto master sheet opens with **Vehicle 1** (VIN, year, make, model, usage, garaging ZIP, address). Vehicle 2 is not alone. **+ Add vehicle** under the last block. Personal lines cap at **five**. Commercial Auto is unlimited. |
| AB2 | Driver blocks | **Driver 1** by default. **+ Add driver** grows the list. Same personal / commercial cap as vehicles. |
| AB3 | Upload rows | Each document is its own row with a trash can. **+ Add another document** under the last row. Filename is **plain text**, not a button. |
| AB4 | Tabs flush | Documents · Markets · Quotes sit **flush under the deal header**. No empty band between the name and the first tab. |

### AB — Tags + 8x8

| # | Check | Pass when |
| --- | --- | --- |
| AB5 | Sheet tags | Lead, Contact, Policy, and Deal data sheets show **Tags** with suggested defaults. Agents can add their own. Lead tags that make sense (referral, custom) carry onto the Contact at convert / bind. |
| AB6 | List tags | Leads, Contacts, Deals, and Policies table rows show the same tags. |
| AB7 | 8x8 | Settings → Integrations → Phone / SMS lists **8x8** as a Phone and SMS provider, next to the **Mac Continuity** on/off toggle. |

## Mac test prior (`cursor/live-ff-tip-sep7ah`)

Pipeline band only, from `cursor/live-ff-tip-sep7ad` @ `de0c1b3` / tip SHA `38a53d9`. Same layout as AD — **Attach** LEFT `min(819px, 44.8%)`, **Today's Activity** centered in leftover (`flex: 1`), **100px rounded chips**. The flex row + chip box are **baked as JSX inline styles** so the CSS cascade cannot stack Activity under Attach or crush the chips. Colors, labels, tones, and leftover-centering unchanged. Deal detail / table / sidebar / seed untouched. Live Zoho stays book of record. Tip SHA `079243c`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7ah && git pull
npm install
# skip db:migrate / db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AH — Pipeline list (sep7ah)

| # | Check | Pass when |
| --- | --- | --- |
| AH1 | Same row | Attach and Today's Activity sit on **one horizontal band**. Activity is **not** stacked under a full-width Attach. |
| AH2 | Activity | To the **right of Attach**, **centered in leftover space**. Same leftover-centering as sep7ad. |
| AH3 | Chips | Soft **rounded 100px** cards. Icon + count + word **inside**: **Phone**, **SMS**, **Task**, **Meeting**, **Training**. 3D depth + hover lift. Not crushed. |

## Mac test prior (`cursor/live-ff-tip-sep7ad`)

Pipeline band only, from `cursor/live-ff-tip-sep7ac` @ `746501c` / tip SHA `95c423b`. **Attach** stays `min(819px, 44.8%)` LEFT — same place and width, **taller** (`168px`) so search + doc type + Choose file + Add another can breathe. **Today's Activity** sits in the leftover space to the right (`flex: 1`) and is **centered** in that region — not pinned to the far right, not a second `797px / 43.6%` slot. Chips are **soft-rounded 100px cards** (12px radius), **bigger** than the 60px squares, with **Phone / SMS / Task / Meeting / Training** + icon + count **inside**. 3D fill + 6px hover lift. **No panel fill** behind chips. Deal detail / table / sidebar / seed untouched. Live Zoho stays book of record. Tip SHA `38a53d9`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7ad && git pull
npm install
# skip db:migrate / db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AD — Pipeline list (sep7ad)

| # | Check | Pass when |
| --- | --- | --- |
| AD1 | Attach | Same left place and width as sep7ac (`819px / 44.8%`). Panel is **taller** so the doc-type row is not cut off. Nothing else on Attach moved. |
| AD2 | Activity | To the **right of Attach**, **centered in leftover space**. Not slammed to the far-right edge. Not a fixed `%` / `797px` slot filling the row. |
| AD3 | Chips | Soft **rounded** cards (not 4px razor squares). **Bigger** than 60px. Icon + count + word **inside**: **Phone**, **SMS**, **Task**, **Meeting**, **Training**. 3D depth + hover lift. No panel behind the row. |

## Mac test prior (`cursor/live-ff-tip-sep7ac`)

Pipeline band only, from `cursor/live-ff-tip-sep7aa` @ `011c324`. **Exact red-box sizes** (1829px content crop): **Attach** `min(819px, 44.8%)` LEFT, **4px gap**, **Today's Activity** `min(797px, 43.6%)` immediately RIGHT. Flex-start from the page inset — **no** `justify-between` / edge slam. Trailing space after Activity stays empty. Counters are **60×60 squares** (icon + count inside, tiny label under), solid colored fills, 3D depth, 6px hover lift. **No panel fill** behind chips. Deal detail / table / sidebar / seed untouched. Live Zoho stays book of record. Tip SHA `95c423b`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7ac && git pull
npm install
# skip db:migrate / db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AC — Pipeline list (sep7ac)

| # | Check | Pass when |
| --- | --- | --- |
| AC1 | Placement | Attach and Today's Activity sit on **one horizontal band** at the content inset. They sit **next to each other** (4px gap). **No** huge empty middle. Activity is **not** stacked under Attach. |
| AC2 | Widths | Attach is **819px / 44.8%** (left red box). Activity is **797px / 43.6%** (right red box). Neither stretches to fill. Extra viewport width stays empty on the right. |
| AC3 | Square chips | Each counter is a **60×60 square** (width = height, ≤**4px** radius), icon + count inside, tiny label under. Solid Call / Email / Task / Meeting / Training fill, raised **3D** depth. Hover **lifts 6px**. No gray/white panel behind the chips. |

## Mac test prior (`cursor/live-ff-tip-sep7ag`)

Deal detail only, from `cursor/live-ff-tip-sep7ab` @ `9cf10e3` / tip SHA `18c6ebc`. One checkbox (**I visually reviewed this master sheet.**) and one action (**Confirm & request quotes**) — disabled until the box is ticked, then one click confirms the sheet and shops every in-appetite carrier. Documents · Markets · Quotes sit **flush under the deal header** (`-mt-5` cancels main padding). **Deals has no Quotes subfolder** — Quotes is a deal-detail tab only (`NAV_LAYOUT_VERSION` **9**). No other sidebar change. No Pipeline attach/activity change. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `dcfeae7`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7ag && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deal detail** (Ana unbound). Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AG — Deal detail

| # | Check | Pass when |
| --- | --- | --- |
| AG1 | One button | Documents has **no** separate **Confirm sheet** button. One checkbox: **I visually reviewed this master sheet.** The only action is **Confirm & request quotes**, disabled until the box is ticked. One click confirms the sheet and requests quotes from every in-appetite carrier. |
| AG2 | Tabs flush | Documents · Markets · Quotes sit **flush under the deal header**. No empty band between the name and the first tab. |
| AG3 | No Quotes folder | Sidebar **Deals** has **no** nested Quotes child. No dead `/deals/quotes` link. Quotes lives only as the Deal detail tab. Customize can still add the catalog Quotes row; it is not a default Deals subfolder. |

## Mac test prior (`cursor/live-ff-tip-sep7ab`)

Deal detail + Integrations, from `cursor/live-ff-tip-sep7aa` @ `011c324` / tip SHA `a86a834` (later sep7aa Pipeline band left alone). Vehicle and driver blocks start at **one**. Documents upload is repeatable rows. Tabs sit **flush under the deal header**. Tags on lead / contact / policy / deal sheets and list rows. **8x8** + **Mac Continuity** on Settings → Integrations. No sidebar change. Additive migrate only — do not `db:seed`. Ana unbound. Live Zoho stays book of record. Tip SHA `18c6ebc`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7ab && git pull
npm install
npm run db:migrate
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deal detail** (Ana unbound) and **Settings → Integrations**. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AB — Deal detail

| # | Check | Pass when |
| --- | --- | --- |
| AB1 | Vehicle blocks | Auto master sheet opens with **Vehicle 1** (VIN, year, make, model, usage, garaging ZIP, address). Vehicle 2 is not alone. **+ Add vehicle** under the last block. Personal lines cap at **five**. Commercial Auto is unlimited. |
| AB2 | Driver blocks | **Driver 1** by default. **+ Add driver** grows the list. Same personal / commercial cap as vehicles. |
| AB3 | Upload rows | Each document is its own row with a trash can. **+ Add another document** under the last row. Filename is **plain text**, not a button. |
| AB4 | Tabs flush | Documents · Markets · Quotes sit **flush under the deal header**. No empty band between the name and the first tab. |

### AB — Tags + 8x8

| # | Check | Pass when |
| --- | --- | --- |
| AB5 | Sheet tags | Lead, Contact, Policy, and Deal data sheets show **Tags** with suggested defaults. Agents can add their own. Lead tags that make sense (referral, custom) carry onto the Contact at convert / bind. |
| AB6 | List tags | Leads, Contacts, Deals, and Policies table rows show the same tags. |
| AB7 | 8x8 | Settings → Integrations → Phone / SMS lists **8x8** as a Phone and SMS provider, next to the **Mac Continuity** on/off toggle. |

### AA — Pipeline list (sep7aa, unchanged)

| # | Check | Pass when |
| --- | --- | --- |
| AA1 | Same row | Attach LEFT compact (~60%). Today's Activity RIGHT. One horizontal band. No stack. No wrap. |
| AA2 | Square chips | Each counter is a **72×72 square** (width = height, ≤**4px** radius), solid Call / Email / Task / Meeting / Training fill, raised **3D** depth. Hover **lifts 6px**. No gray/white panel behind the chips. |
| AA3 | No orphan trash | Trash appears **only on a document row** inside Attach (when a file is chosen, or on extra rows). +Add another document still works. |

## Mac test prior (`cursor/live-ff-tip-sep7aa`)

Pipeline band only, from `cursor/live-ff-tip-sep7y` @ `0a8ea92` / tip SHA `48b78b4`. **Attach LEFT** (compact ~60%, not full-page). **Today's Activity RIGHT on the same row** — never under Attach, no wrap. Activity counters are **72×72 squares** (≤4px radius), solid colored fills, 3D depth, 6px hover lift. **No panel fill** behind chips. Attach multi-row / trash / +Add stay. Deal detail from sep7z/sep7x is untouched. No table / filter / sidebar / seed / Ana changes. Live Zoho stays book of record. Tip SHA `a323bf6`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7aa && git pull
npm install
# skip db:migrate / db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### AA — Pipeline list (sep7aa)

| # | Check | Pass when |
| --- | --- | --- |
| AA1 | Same row | Attach LEFT compact (~60%). Today's Activity RIGHT. One horizontal band. No stack. No wrap. |
| AA2 | Square chips | Each counter is a **72×72 square** (width = height, ≤**4px** radius), solid Call / Email / Task / Meeting / Training fill, raised **3D** depth. Hover **lifts 6px**. No gray/white panel behind the chips. |
| AA3 | No orphan trash | Trash appears **only on a document row** inside Attach (when a file is chosen, or on extra rows). +Add another document still works. |

### B — Deal detail (sep7x @ `6ca87d0`, unchanged on sep7aa)

| # | Check | Pass when |
| --- | --- | --- |
| X1 | No e-sign | Documents has **no** “In-desk signature” block. Upload + master sheet stay. |
| X2 | Markets flush | **In appetite / Stretch / Skip** and **Approve & request quotes** sit **directly under** the tab bar. No empty gap above them. Manual add still lists only carriers that write this line. |
| X3 | Line of business | Documents opens with a **Line of business.** dropdown (Homeowners, Renters, Landlord, Auto, RV, Motorcycle, Flood, GL, Workers' Comp, Commercial Auto, plus niche). Default **Homeowners**. Changing it swaps the master sheet. One deal, one product. Uses existing deal LOB / quoting line / `policySubType` / sheet product — no schema. |
| X4 | Quotes empty | Quotes is empty until Markets sends quotes back. No results chrome, bind gate, or attempt log while empty. |

## Mac test prior (`cursor/live-ff-tip-sep7z`)

Consolidator: live Pipeline tip `cursor/live-ff-tip-sep7w` @ `0c79cfa` / `8f9bc84` (chips / attach rows / no deal-name field) plus Deal detail `cursor/live-ff-tip-sep7x` @ `6ca87d007fc60f42469a05017a783dddc8dcd805` (kill e-sign, Markets flush, LOB selector, Quotes empty). Prefer sep7w for Deals / Pipeline list. Prefer sep7x for `/deals/[id]`. No sidebar / schema / seed. Ana unbound. Live Zoho stays book of record — no live Zoho writes. Tip SHA `2555bf3`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7z && git pull
npm install
# skip db:migrate / db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open **Ana Dib** on Deal detail. Do not bind or edit Ana (unbound, Cov A **$321,000**).

### A — Pipeline list (sep7w @ `8f9bc84`)

| # | Check | Pass when |
| --- | --- | --- |
| W1 | Today's Activity chips | Square them back up — no rounded corners, sharp **4px radius max**. **Remove the background fill entirely.** Chips float on the page with only a **thin border** and a **soft shadow underneath**. Hover: lift **4px** with a stronger shadow so they feel like they're rising off the surface. Add **`overflow: hidden`** to the strip container so nothing spills out. |
| W2 | Attach documents to a deal | Make the row **repeatable**: each document is its own line with a **trash can**. Add a **"+ Add another document"** link below the last row so agents can attach multiple files. The document name is **plain text, not a button** — no background, no border, just the filename. Keep the box compact, about **120px tall**, matching the activity strip. |
| W3 | Duplicate deal name | **Remove the deal name field** from the Table, Board, and Funnel views. The global search at the top already handles it, and the upload box has its own contact field. |

### B — Deal detail (sep7x @ `6ca87d0`)

| # | Check | Pass when |
| --- | --- | --- |
| X1 | No e-sign | Documents has **no** “In-desk signature” block. Upload + master sheet stay. |
| X2 | Markets flush | **In appetite / Stretch / Skip** and **Approve & request quotes** sit **directly under** the tab bar. No empty gap above them. Manual add still lists only carriers that write this line. |
| X3 | Line of business | Documents opens with a **Line of business.** dropdown (Homeowners, Renters, Landlord, Auto, RV, Motorcycle, Flood, GL, Workers' Comp, Commercial Auto, plus niche). Default **Homeowners**. Changing it swaps the master sheet. One deal, one product. Uses existing deal LOB / quoting line / `policySubType` / sheet product — no schema. |
| X4 | Quotes empty | Quotes is empty until Markets sends quotes back. No results chrome, bind gate, or attempt log while empty. |

## Mac test prior (`cursor/live-ff-tip-sep7w`)

Three Pipeline-page fixes only, on top of `cursor/live-ff-tip-sep7v` @ `9dede457fabeac939ce10e33d6726674a5607575`. Band order is unchanged: **Attach LEFT**, **Activity RIGHT**. No Deal detail. No other pages. No table-column / filter / sidebar / schema / seed changes. Ana unbound. Live Zoho stays book of record — no live Zoho writes. Tip SHA `8f9bc84`.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7w && git pull
npm install
# db:migrate / db:seed only if this desk is behind
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana Dib (unbound, Cov A **$321,000**).

### W — Pipeline list (sep7w)

| # | Check | Pass when |
| --- | --- | --- |
| W1 | Today's Activity chips | Square them back up — no rounded corners, sharp **4px radius max**. **Remove the background fill entirely.** Chips float on the page with only a **thin border** and a **soft shadow underneath**. Hover: lift **4px** with a stronger shadow so they feel like they're rising off the surface. Add **`overflow: hidden`** to the strip container so nothing spills out. |
| W2 | Attach documents to a deal | Make the row **repeatable**: each document is its own line with a **trash can**. Add a **"+ Add another document"** link below the last row so agents can attach multiple files. The document name is **plain text, not a button** — no background, no border, just the filename. Keep the box compact, about **120px tall**, matching the activity strip. |
| W3 | Duplicate deal name | **Remove the deal name field** from the Table, Board, and Funnel views. The global search at the top already handles it, and the upload box has its own contact field. |

## Mac test prior (`cursor/live-ff-tip-sep7x`)

Deal detail only, on `cursor/live-ff-tip-sep7v` @ `9dede45`. Four fixes on `/deals/[id]`: drop in-desk signature, pin Markets buckets under the tab bar, add a Line of business selector that swaps the master sheet, leave Quotes empty until Markets returns rows. No Pipeline list, sidebar, schema, or other-page changes. No seed. Ana unbound. Live Zoho stays book of record — no live Zoho writes.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7x && git pull
npm install
# skip db:migrate / db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Open **Ana Dib** on Deal detail. Do not bind (unbound, Cov A **$321,000**).

### X — Deal detail (sep7x)

| # | Check | Pass when |
| --- | --- | --- |
| X1 | No e-sign | Documents has **no** “In-desk signature” block. Upload + master sheet stay. |
| X2 | Markets flush | **In appetite / Stretch / Skip** and **Approve & request quotes** sit **directly under** the tab bar. No empty gap above them. Manual add still lists only carriers that write this line. |
| X3 | Line of business | Documents opens with a **Line of business.** dropdown (Homeowners, Renters, Landlord, Auto, RV, Motorcycle, Flood, GL, Workers' Comp, Commercial Auto, plus niche). Default **Homeowners**. Changing it swaps the master sheet. One deal, one product. Uses existing deal LOB / quoting line / `policySubType` / sheet product — no schema. |
| X4 | Quotes empty | Quotes is empty until Markets sends quotes back. No results chrome, bind gate, or attempt log while empty. |

## Mac test prior (`cursor/live-ff-tip-sep7v`)

Pipeline layout polish only, on top of consolidator `cursor/live-ff-tip-sep7u` @ `fb589fd`. Band order is unchanged: **Attach documents on the left**, **Today's Activity counters on the right**. Activity strip sits **24px** in from the page edge, **overflow: hidden**, **4px** internal pad. Chips are **36px** tall with gradient, thin matching border, soft shadow, and **2px** hover lift. Attach is a **~120px** single row (search, doc type, Choose file, Store on this deal) with the same chrome as the activity strip. No `+ Add file`. No table / filter / sidebar / Deal detail / schema / seed changes. Ana unbound. Live Zoho stays book of record — no live Zoho writes.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7v && git pull
npm install
# db:migrate / db:seed only if this desk is behind
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana Dib (unbound, Cov A **$321,000**).

### V — Pipeline list (sep7v)

| # | Check | Pass when |
| --- | --- | --- |
| V1 | Activity inset | Today's Activity has **24px** left margin so it aligns with the table below, not the page edge. |
| V2 | Clip + pad | Strip container is **overflow: hidden** with **4px** internal padding. The **2px** hover lift has room and chips do not spill. |
| V3 | Chips | Chips are **36px** tall, gradient, thin matching border, soft shadow. Hover lift is **2px** max — not the 7px lift. |
| V4 | Attach row | Attach is **~120px** total, one inline row: search, doc type, Choose file, Store on this deal. No stacked layout. No **+ Add file**. |
| V5 | Matched chrome | Attach uses the same background, border, and corner radius as the activity strip. Heights match. |
| V6 | Unchanged | Table, filters, sidebar, mass update, picker, Bind, Deal detail, and schema are the same as sep7u @ `fb589fd`. |

## Mac test prior (`cursor/live-ff-tip-sep7u`)

Consolidator: live desk tip `cursor/live-ff-tip-sep7t` @ `b9f0521` (Pipeline Attach left / Activity right / ~1.6× attach / lighter chips / bigger type / hover) plus Deal detail final rebuild `cursor/live-ff-tip-sep7s` @ `db18aeb` (3 tabs Documents / Markets / Quotes, deal-name title, master sheet in Documents). Prefer sep7t for Deals / Pipeline list. Prefer sep7s for `/deals/[id]`. Global Call / SMS / Email / Task stay on the profile bar — no local colored strips on lead or deal forms. No sidebar redesign. No schema. No seed wipe. Live Zoho stays book of record — no live Zoho writes.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7u && git pull
npm install
# db:migrate / db:seed only if this desk is behind
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open a **Deal**. Do not bind or edit Ana Dib (unbound, Cov A **$321,000**).

### A — Pipeline list (sep7t @ `b9f0521`)

| # | Check | Pass when |
| --- | --- | --- |
| T1 | Band order | Same as `cb23a8f`: Attach documents is on the **left**. Today's Activity counters are to the **right of** Attach. |
| T2 | Attach size | Attach card is ~**60% bigger** in height **and** width (~1.6× the sep7r card). Search, doc type, file picker, Store still work. |
| T3 | Readable chips | Chip faces are lighter, especially the **lower shade**. Count and label stay readable at the bottom. Raised 3D is still there. |
| T4 | Bigger type | **Today's Activity** title, chip labels, and counts are a little bigger. Calendar icon matches. Title + date + calendar stay centered over the counters. |
| T5 | Hover motion | Hover lifts farther (`translateY` + ~1.04 scale) with a deeper shadow. No clipping. Click still opens that type's work queue. |
| T6 | Unchanged | Mass update, record picker, Bind, sidebar, and schema are the same as sep7r @ `cb23a8f`. Deal detail is sep7s. |

### B — Deal detail (sep7s @ `db18aeb`)

| # | Check | Pass when |
| --- | --- | --- |
| S1 | Title | Top-left is **only the deal name** (e.g. `test - HO shop.`). No “FitFirst” in the title. |
| S2 | Tabs | **Documents · Markets · Quotes** sit directly under the deal name. No empty left gutter. No Quote Sheet tab. Old `?tab=quote-sheet` opens Documents. |
| S3 | Documents | Left: one compact upload (type, file, create) + source files with trash-cans. Right: editable master sheet. Empty before extract; filled beside the source after. Confirm the sheet at the bottom — then **Approve & request quotes** unlocks. |
| S4 | Master sheet | Shared applicant core (name, address, phone, email, DOB, entity). HO is a full homeowners inventory (construction / wind mit / 4-point). Auto / flood / GL / WC swap in their sections. One deal, one product. Agent corrections become mapping rules for that form. |
| S5 | Markets | In appetite / Stretch / Skip. Manual add lists only carriers that write this line. **Approve & request quotes** submits to every in-appetite carrier. IVANS / EZLynx / QuoteRush stay paid stubs. |
| S6 | Quotes | Per carrier: premium, coverages, deductibles, status. Cheapest on top. First pull from a new carrier confirms; then sample one in five. Bind gate re-checks premium + coverages + deductibles. Ana stays locked / unbound, Cov A **$321,000**. |
| S7 | Quick comms | Sticky right rail: Task, Meeting, Call, Email, SMS. No local colored Call / SMS / Email / Task strip next to the deal name — those stay on the profile bar. |
| S8 | Motivation | Corner sparkline: quotes pulled today + bind rate this month. At most one sixth of the screen. |

## Mac test prior (`cursor/live-ff-tip-sep7t`)

Feel-pass polish on **Deals / Pipeline list only**, on top of `cursor/live-ff-tip-sep7r` @ `cb23a8f`. Band order is unchanged: **Attach documents on the left**, **Today's Activity counters on the right**. Attach is **~1.6×** taller and wider. Activity chips keep raised 3D but use **lighter faces** (especially the lower shade) so the count stays readable. Title, chip labels/counts, and the calendar icon are a step larger. Hover lifts farther with a slight scale and deeper shadow. No mass update / picker / Bind / Deal detail / sidebar / schema changes. No seed wipe. Live Zoho stays book of record — no live Zoho writes. Tip SHA `b9f0521`.

## Mac test prior (`cursor/live-ff-tip-sep7s`)

Deal detail final rebuild on **`/deals/[id]` only**. Cut from `cursor/live-ff-tip-sep7r` @ `cb23a8f`. Pipeline list band stays sep7r — do not rewrite Attach / Today's Activity. Title is **the deal name only** (no FitFirst). Tabs sit **directly under the name**: Documents · Markets · Quotes. Quote Sheet tab is gone — the master sheet lives on Documents. No sidebar / data model / other-page changes. No seed wipe. Live Zoho stays book of record — no live Zoho writes. Tip SHA `db18aeb`.

## Mac test prior (`cursor/live-ff-tip-sep7r`)

Polish on **Deals / Pipeline list only**, on top of `cursor/live-ff-tip-sep7q` @ `9f5e807`. Band order is unchanged: **Attach documents on the left**, **Today's Activity counters on the right**. Attach is a little roomier. Chips stay the **same size** with **deeper 3D** only. Title + date + calendar stay **centered over the counters**. No mass update / picker / Bind / Deal detail / sidebar / schema changes. No seed wipe. Live Zoho stays book of record — no live Zoho writes.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7r && git pull
npm install
# db:migrate / db:seed only if this desk is behind
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana Dib (unbound, Cov A **$321,000**).

### R — Pipeline list (sep7r)

| # | Check | Pass when |
| --- | --- | --- |
| R1 | Band order | Same as `9f5e807`: Attach documents is on the **left**. Today's Activity counters are to the **right of** Attach. |
| R2 | Attach size | Attach card is a little bigger (padding / control height) and still **≤ half page**. Search, doc type, file picker, Store still work. |
| R3 | Centered title | **Today's Activity** + real date + calendar sit **visually centered** above the chip row. Calendar opens Tasks. |
| R4 | Same-size deeper 3D | Chip **size is unchanged**. Stronger top bevel and deeper layered shadow only. Hover lifts with no clipping. |
| R5 | Unchanged | Mass update, record picker, Bind, Deal detail, sidebar, and schema are the same as sep7q @ `9f5e807`. |

## Mac test prior (`cursor/live-ff-tip-sep7q`)

Column swap on **Deals / Pipeline list only**. Cut from `cursor/live-ff-tip-sep7p` @ `a37ef2b`. Band order is **Attach documents on the left**, **Today's Activity counters on the right**: `[ Attach docs ] [ Today's Activity counters ]`. Attach stays modest, **≤ half page**. Title + date + calendar stay **centered over the counters**. Chips stay raised 3D. No mass update / picker / Bind / Deal detail / sidebar / schema changes. No seed wipe. Live Zoho stays book of record — no live Zoho writes.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7q && git pull
npm install
# db:migrate / db:seed only if this desk is behind
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana Dib (unbound, Cov A **$321,000**).

### Q — Pipeline list (sep7q)

| # | Check | Pass when |
| --- | --- | --- |
| Q1 | Band order | Attach documents is on the **left**. Today's Activity counters are to the **right of** Attach. Not Activity-left-of-Attach. Real gap between them. |
| Q2 | Attach size | Attach card is modest and **≤ half page width**. Search, doc type, file picker, Store still work. |
| Q3 | Centered title | **Today's Activity** + real date + calendar sit **visually centered** above the chip row. Calendar opens Tasks. |
| Q4 | Raised 3D chips | Calls / Emails / Tasks / Meetings / Training read as raised buttons: bright top highlight, darker bottom face, layered drop shadow. Hover lifts with a deeper shadow and no clipping. Click opens that type's work queue. |
| Q5 | Unchanged | Mass update, record picker, Bind, Deal detail, sidebar, and schema are the same as sep7p. |

## Mac test prior (`cursor/live-ff-tip-sep7p`)

Feel-pass layout fix on **Deals / Pipeline list only**. Cut from `cursor/live-ff-tip-sep7o` @ `600c260`. Today's Activity sat on the left of Attach documents (later corrected on sep7q). Attach stays modest, **≤ half page**. Title + date + calendar are **centered over the counters**. Chips are true raised 3D. No mass update / picker / Bind / Deal detail / sidebar / schema changes.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7p && git pull
npm install
# db:migrate / db:seed only if this desk is behind
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana Dib (unbound, Cov A **$321,000**).

### P — Pipeline list (sep7p)

| # | Check | Pass when |
| --- | --- | --- |
| P1 | Left band | Today's Activity is to the **left of** Attach documents. Both sit on the **left side** of the page. Attach is not in the right corner. |
| P2 | Attach size | Attach card is modest and **≤ half page width**. Search, doc type, file picker, Store still work. |
| P3 | Centered title | **Today's Activity** + real date + calendar sit **visually centered** above the chip row — not left-ragged against empty space. Calendar opens Tasks. |
| P4 | Raised 3D chips | Calls / Emails / Tasks / Meetings / Training read as raised buttons: bright top highlight, darker bottom face, layered drop shadow. Hover lifts with a deeper shadow and no clipping. Click opens that type's work queue. |
| P5 | Unchanged | Mass update, record picker, Bind, Deal detail, sidebar, and schema are the same as sep7o. |

## Mac test prior (`cursor/live-ff-tip-sep7o`)

Consolidator: live desk tip `cursor/live-ff-tip-sep7m` @ `cecc68f` (Pipeline activity left / upload right / 3D chips / mass update / picker / Bind) plus Deal detail rebuild `cursor/live-ff-tip-sep7n` @ `b13fc7b` (Documents compare, Markets, Quotes, bind gate, carrier history, motivation widgets). Prefer sep7m for Deals / Pipeline list. Prefer sep7n for `/deals/[id]`. Global Call / SMS / Email / Task stay on the profile bar — no local colored strips on lead or deal forms. No sidebar redesign. No schema. No seed wipe. Live Zoho stays book of record — no live Zoho writes.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7o && git pull
npm install
# db:migrate / db:seed only if this desk is behind
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**, then open a **Deal**. Do not bind or edit Ana Dib (unbound, Cov A **$321,000**).

### A — Pipeline list (sep7m @ `cecc68f`)

| # | Check | Pass when |
| --- | --- | --- |
| A1 | Today's Activity | Left of the upload card, with a real gap. Title is **Today's Activity** with the date under it (e.g. Monday, Sep 7). Calendar icon opens Tasks (work queue). Chips have padding so text/icons are not crammed. |
| A2 | Chips | Calls / Emails / Tasks / Meetings / Training read as raised 3D buttons: lighter top highlight, darker bottom, layered float shadow. Hover lifts without clipping. Click opens that type's work queue. |
| A3 | Upload | Card sits top-right — a little smaller than the pre-compact block, not a skinny full-width row. Search, doc type, file picker, Store. |
| A4 | Mass update | Select-all is visible rows, or **Select all N matching**. Menu: status, source, follow-up template, owner, custom field. Wired on Deals; same control on Leads / Contacts / Policies. Bound is not a mass status. |
| A5 | Record picker | Header Call / SMS / Email / Task search leads, deals, and contacts. Pick fills name / phone / email. Manual entry still works. |
| A6 | Bind policy | Comms **Bind policy** requests client signature. On sign, the deal goes to **Bound** and a policy number attaches. No manual stage change. Ana stays unbound. |

### B — Deal detail (sep7n @ `b13fc7b`)

| # | Check | Pass when |
| --- | --- | --- |
| B1 | Tabs | `/deals/[id]` tabs are **Documents · Quote Sheet · Markets · Quotes**. No Master Risk. No local Call / SMS / Email / Task strip on the form. |
| B2 | Documents | Source-doc upload plus master-sheet compare. Delete on each file. Sheet health is a collapse toggle, not a full-width banner. |
| B3 | Markets | Appetite / stretch / skip. **Approve & request quotes** / **Request stretch quotes**. Manual carrier add. Paid API wall — no live rater. |
| B4 | Quotes | Cheapest first. Confirm low-confidence pulls. Bind gate requires premium + coverages + deductibles. Ana cannot bind. |
| B5 | Motivation | Corner widgets: quotes pulled today + bind rate this month. Sample copy when the desk has no counts. |
| B6 | Carrier history | Admin → Operations → Carrier history. Date filter. Not a new sidebar row. |

## Mac test prior (`cursor/live-ff-tip-sep7m`)

Crew J Pipeline / Deals on tip `cursor/live-ff-tip-sep7l` @ `91b46b0`. Today's Activity strip (dated title + calendar → Tasks work queue), floating chips, compact one-row upload, shared mass update, record picker on Call / SMS / Email / Task, Bind policy on client signature. No sidebar. No schema. No seed wipe. Live Zoho stays book of record — no live Zoho writes.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7m && git pull
npm install
# db:migrate / db:seed only if this desk is behind
# skip db:seed on the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals / Pipeline**. Do not bind or edit Ana Dib (unbound, Cov A **$321,000**).

| # | Check | Pass when |
| --- | --- | --- |
| M1 | Today's Activity | Left of the upload card, with a real gap. Title is **Today's Activity** with the date under it (e.g. Monday, Sep 7). Calendar icon opens Tasks (work queue). Chips have padding so text/icons are not crammed. |
| M2 | Chips | Calls / Emails / Tasks / Meetings / Training read as raised 3D buttons: lighter top highlight, darker bottom, layered float shadow. Hover lifts without clipping. Click opens that type's work queue. |
| M3 | Upload | Card sits top-right — a little smaller than the pre-compact block, not a skinny full-width row. Search, doc type, file picker, Store. |
| M4 | Mass update | Select-all is visible rows, or **Select all N matching**. Menu: status, source, follow-up template, owner, custom field. Wired on Deals; same control on Leads / Contacts / Policies. Bound is not a mass status. |
| M5 | Record picker | Header Call / SMS / Email / Task search leads, deals, and contacts. Pick fills name / phone / email. Manual entry still works. |
| M6 | Bind policy | Comms **Bind policy** requests client signature. On sign, the deal goes to **Bound** and a policy number attaches. No manual stage change. Ana stays unbound. |

## Mac test prior (`cursor/live-ff-tip-sep7l`)

Consolidator: desk tip `cursor/live-ff-tip-sep7k` plus Crew H Leads correction `cursor/live-ff-tip-sep7g` @ `93ee4db` (global top-right Call / SMS / Email / Task for this lead; trash on each line-of-interest card, immediate delete, no confirm; title **Leads**). Prefer sep7g for Leads / lead detail / shell chrome related to those actions. Prefer sep7k for Deals / Pipeline. No sidebar. No schema. No seed wipe. `0079_documents_lead_id` is already on this branch.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7l && git pull
npm install
# skip db:migrate unless this desk is behind sep6x (`0079_documents_lead_id`)
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**, open a **Lead**, then **Deals**.

### A — Leads (sep7g @ `93ee4db`)

| # | Check | Pass when |
| --- | --- | --- |
| A1 | Buttons | **Save lead** is a text link and **Convert** is a normal-sized primary button. Both sit on one compact right-aligned row. No stacked full-width blocks. |
| A2 | Title | Header title is **Leads**. No “FitFirst Leads” in the top-left. |
| A3 | Lines | No Home / Auto / Flood card until the agent picks from **Add line**. Empty state reads **Add a line of interest.** |
| A4 | Documents | Documents-by-line is ~60% of the width, form ~40%. Long filenames truncate with an ellipsis; hover shows the full name. Layout does not wrap. |
| A5 | Quick actions | Global top bar, next to profile / notifications: **Call / SMS / Email / Task**. Each click opens a working composer (dialer, text, email, task) pre-filled with this lead. No colored Call / SMS / Email / Task pills on the lead form. |
| A6 | Line trash | Each line-of-interest card has a right-aligned trash can. Click removes the card immediately — no confirm. |
| A7 | Template on/off | Follow-up Templates list has an on/off toggle per template. Off = that template never fires (no clock / steps / notifications). Aggressive off does not affect Default / Steady / Drip. Toggle back on anytime. |
| A8 | Skip method | Method dropdown is **Call / Text / Email / Skip**. Skip is a no-op — the clock advances to the next step without contacting the lead. |
| A9 | Crash / clock | New lead binds **Aggressive** and starts a live Response countdown. Status / clock / template stay per row. No **Load failed**. Snooze / Mark as read / pagination / one-confirm Delete still work. |
| A10 | Lead detail | Two-column desk (form left, documents-by-line right). One **Add line** control. Per-line **Choose file** + trash. **View related deal** / **View source lead**. |

**Standing platform rule:** Call / SMS / Email / Task live in the **global top bar by profile / notifications** on every screen. They are not a colored button strip on the record form. On lead detail they pre-fill this lead. Shared chrome is `HeaderRecordActions`. Deals list rows keep the local five-action `DealQuickActions` (Call / SMS / Email / Task / Meeting).

### B — Deals / Pipeline (sep7k)

| # | Check | Pass when |
| --- | --- | --- |
| B1 | Title | Header says **Deals / Pipeline**. View switcher is only **Table / Board / Funnel** — no “Pipeline” label there. |
| B2 | Attach + today | Upload block is ~two-thirds width and titled **Attach documents to a deal**. Right strip is **Today's Activity**: tinted chips on the page color (no white box), centered, black borders. Order matches row actions minus SMS: **Calls, Emails, Tasks, Meetings, Training**. Colors match Call mustard / Email navy / Task blue / Meeting purple (Training stays teal). No SMS chip. Bold count ~1.5× the label. Hover lifts. Click a chip → work queue of that type. One row. No mini-calendar. |
| B3 | Row actions | Under the deal name: phone, then **Call / SMS / Email / Task / Meeting**. Task is calendar blue. Meeting is the blue-purple chip color. Comms column is **Send quote / Change owner / Bind policy**. No “Text”. No duplicate phone column. |
| B4 | Create vs select | Search Gonzalez (existing). Button is **Select this deal** — files attach to that record. **Create deal** only appears when search has no match. |
| B5 | Next-action timer | Every row has a live countdown to the next follow-up. Turns **red** the moment it is overdue. |
| B6 | Quote-to-bind | **Send quote** opens the proposal. Mark the in-desk e-sign **signed** — deal stage becomes **Bound** and a policy number is attached. Ana stays unbound. |
| B7 | Stale flag | A deal untouched past 14 days shows a **Stale** badge with **Re-engage** or **Archive**. |
| B8 | Contact second | **Contact** is the column immediately after **Deal**. Phone lives under the name only. |
| B9 | Kept from sep6z | Filters, pagination 25/50/100/200 (default 25), Value column, no null `data-sort`, Change owner names the agent, receiver gets a ping. |
| B10 | Deal search | **Deal** header is live typeahead (same as Leads **Name**). No ASC/DESC funnel on that column. Typing filters matching deal names immediately. |
| B11 | Chip spacing | P&C / Health / Life sit with more horizontal room. Won-Lost and Archive sit further from that group and from each other. |

## Mac test prior (`cursor/live-ff-tip-sep7k`)

Consolidator: desk tip `cursor/live-ff-tip-sep7j` plus Today's Activity from `cursor/live-ff-tip-sep7h` @ `0a7ff00` (Call / Email / Task / Meeting colors + order, no SMS, black chip borders). Prefer sep7h for Deals activity strip / pipeline bar. Keep sep7j for everything else. No sidebar. No schema. No seed wipe. Tip SHA `d92cd0c`.

## Mac test prior (`cursor/live-ff-tip-sep7j`)

Consolidator: Leads tip `cursor/live-ff-tip-sep7i` @ `0b4ed28` plus latest Deals tip `cursor/live-ff-tip-sep7h` @ `8c69e76` (Deal column live name search + Pipeline chip spacing). Tip SHA `8269e9c`.

## Mac test prior (`cursor/live-ff-tip-sep7i`)

Consolidator: Leads tip `cursor/live-ff-tip-sep7g` @ `985fdcb` (Crew H: lead-detail polish + Follow-up Templates on/off + Skip) plus Crew I Deals / Pipeline (`cursor/live-ff-tip-sep7h` @ `c80f4e1`). Tip SHA `0b4ed28`.

## Mac test prior (`cursor/live-ff-tip-sep7h`)

Crew I Deals / Pipeline brief on desk tip `cursor/live-ff-tip-sep7f`. Title **Deals / Pipeline**, five row actions (Call / SMS / Email / Task / Meeting), tinted Today's Activity chips, Contact column second. Tip SHA `c80f4e1`.

## Mac test prior (`cursor/live-ff-tip-sep7g`)

Crew H: lead-detail layout polish plus Follow-up Templates editor (per-template on/off + Skip), then correction @ `93ee4db` — move Call / SMS / Email / Task to the global header and add line-card trash. Branched from `cursor/live-ff-tip-sep7f`. Does **not** retouch Deals, sidebar, schema, or the snooze modal. Tip SHA `93ee4db`.

## Mac test prior (`cursor/live-ff-tip-sep7f`)

Consolidator: desk tip `cursor/live-ff-tip-sep7e` @ `c08c406` (Crew G: Leads Load-failed crash fix + Aggressive-on-new null guards; already includes sep7d = sep7a clock/delete + sep7b lead detail) plus Crew F Deals Pipeline (`cursor/live-ff-tip-sep7c` @ `4baf6b6`). Leads / follow-up / templates / list-selection / lead detail stay sep7e. Deals / Pipeline / deal upload / deal row actions / today activity strip stay sep7c. No sidebar changes. No schema. No seed wipe. `0079_documents_lead_id` is already on this branch.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep7f && git pull
npm install
# skip db:migrate unless this desk is behind sep6x (`0079_documents_lead_id`)
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**, open a **Lead**, then **Deals**.

### A — Crash / clock / follow-up (sep7a + sep7e)

| # | Check | Pass when |
| --- | --- | --- |
| A1 | Aggressive on new | Create a lead. Within ~1s Follow-up shows **Aggressive** and Response starts a live countdown. No manual Aggressive pick. Page does not flash **Load failed**. |
| A2 | Status isolation | Change one row cold → contacted. Only that row flips. Other rows keep their status, clock, and template. |
| A3 | Snooze labels | Follow-up modal presets are **Snooze 15 min**, **Snooze 1 hour**, **Snooze 1 day**. **Custom snooze** expands to number + unit + **Apply**. Apply actually reschedules. |
| A4 | Mark as read | **Mark as read** advances to the next template step (clock resets, black). Last step: clock stops, Response shows a dash. |
| A5 | Clock bindings | Aggressive → new, Default → contacted, Steady → warm, Drip → cold. Red only when overdue. Edit a template delay — pending clocks reschedule live. |
| A6 | Template steps | Follow-up Templates list shows each step once. Edit view matches the list. |
| A7 | Pagination | Leads and Contacts (or Deals) share the same bottom-right bar: 25 / 50 / 100 / 200 (default 25), **Page 1 of N**, **Showing 1–25 of …**. |
| A8 | Bulk delete | Tick one lead → Actions → Delete → **one** confirm. Lead is gone (search by name/phone finds nothing). No runtime error. Selection clears. |
| A9 | Null guards | Hard refresh Leads on a book with missing template, chip name, or `dueAt`. Queue still renders. No unguarded template / clock read crash. |

**Crash root cause (sep7e):** Leads threw when follow-up template pick, chip name, `dueAt`, or clock publish hit a null. Guards keep the queue up. New leads still bind **Aggressive** (not Default) and keep the Response countdown on that row only.

**Shared-state root cause:** row status / clock / template were not keyed per lead — `publishLeadClock` and React reuse could apply one row’s patch across the table, and `resetLeadsWithoutLoggedContact` rewrote other rows on refresh. Clock patches now require `leadId`; each control is keyed to that lead; the one-shot reset no longer cancels new-lead queues or flips other statuses.

**Delete root cause:** `deleteSelectedLeads` ran `UPDATE eo_audit_logs SET lead_id = NULL`. That table is append-only (`eo_audit_logs is append-only`). Historical audit rows are left as-is. Duplicate confirm was `confirmHardDelete` asking the same question twice.

### B — Lead detail (sep7b)

| # | Check | Pass when |
| --- | --- | --- |
| B1 | Two-column | Left is the lead form. Right is Documents by line. Side by side on a normal desk — does not stack until a phone-narrow window. Address / City / State / ZIP share one row. Email and Phone share one row. Header title is **Leads**. No “Personal Lines Worksheet.” |
| B2 | One line control | Home / Auto / Flood cards are the lines of interest. One **Add line** dropdown at the top of the cards creates another card. No “Add another line” at the bottom. No second line picker on Convert. Selected cards transfer to the deal on convert. |
| B3 | Per-line files | Each card has its own drop zone, starts with one file slot, **+ Add file** adds another. Uploaded rows show a right-aligned trash can that deletes immediately (no confirm). No global lead upload. Files carry onto the deal grouped by the same line. |
| B4 | Choose file | The picker is a **Choose file** button, not a text field. The whole button is the click target. After a pick, the button text becomes the filename. |
| B5 | Lead ↔ Deal | Lead top shows **View related deal**. Deal top shows **View source lead**. |
| B6 | Shared chrome | Convert is centered and bigger than **Save lead**. Save lead shows the navy toast, then lands on the Leads list. Upload button, trash, Columns, funnel sort, row dividers, and status/temp badges stay the shared platform set. |

### C — Deals / Pipeline (sep7h)

| # | Check | Pass when |
| --- | --- | --- |
| C1 | Title | Header says **Deals / Pipeline**. View switcher is only **Table / Board / Funnel** — no “Pipeline” label there. |
| C2 | Attach + today | Upload block is ~two-thirds width and titled **Attach documents to a deal**. Right strip is **Today's Activity**: tinted chips on the page color (no white box), centered. Task blue, Call green, Email amber, Meetings purple, Training teal. Bold count ~1.5× the label. Hover lifts. Click a chip → work queue of that type. One row. No mini-calendar. |
| C3 | Row actions | Under the deal name: phone, then **Call / SMS / Email / Task / Meeting**. Task is calendar blue. Meeting is the blue-purple chip color. Comms column is **Send quote / Change owner / Bind policy**. No “Text”. No duplicate phone column. |
| C4 | Create vs select | Search Gonzalez (existing). Button is **Select this deal** — files attach to that record. **Create deal** only appears when search has no match. |
| C5 | Next-action timer | Every row has a live countdown to the next follow-up. Turns **red** the moment it is overdue. |
| C6 | Quote-to-bind | **Send quote** opens the proposal. Mark the in-desk e-sign **signed** — deal stage becomes **Bound** and a policy number is attached. Ana stays unbound. |
| C7 | Stale flag | A deal untouched past 14 days shows a **Stale** badge with **Re-engage** or **Archive**. |
| C8 | Contact second | **Contact** is the column immediately after **Deal**. Phone lives under the name only. |
| C9 | Kept from sep6z | Filters, pagination 25/50/100/200 (default 25), Value column, no null `data-sort`, Change owner names the agent, receiver gets a ping. |
| C10 | Deal search | **Deal** header is live typeahead (same as Leads **Name**). No ASC/DESC funnel on that column. Typing filters matching deal names immediately. |
| C11 | Chip spacing | P&C / Health / Life sit with more horizontal room. Won-Lost and Archive sit further from that group and from each other. |

## Mac test prior (`cursor/live-ff-tip-sep7e`)

Crew G crash fix on the sep7d desk tip. Null-safe template pick, chip names, dueAt, and clock publish so Leads still renders. New leads bind Aggressive (not Default). Tip SHA `c08c406`.

## Mac test prior (`cursor/live-ff-tip-sep7d`)

Consolidator: Crew D follow-up engine (`cursor/live-ff-tip-sep7a` @ `f615a08`) plus Crew E lead-detail brief (`cursor/live-ff-tip-sep7b`). Does **not** include Deals tip sep7c. No sidebar changes. No schema. No seed wipe.

## Mac test prior (`cursor/live-ff-tip-sep7c`)

Deals page only. Branched from `cursor/live-ff-tip-sep7a`. Pipeline title, attach-documents + Today's activity, select-vs-create, next-action timer, quote-to-bind, stale flag. Tip SHA `4baf6b6`.

## Mac test prior (`cursor/live-ff-tip-sep7a`)

Follow-up engine + shared pagination + Leads bulk delete. Rebased onto `cursor/live-ff-tip-sep6y` (`56e7552`). Tip SHA `f615a08`.

## Mac test prior (`cursor/live-ff-tip-sep7b`)

Lead detail only. Two-column layout, one lines-of-interest control, per-line documents, and the shared Choose file / trash / Convert+Save chrome. Branched from `cursor/live-ff-tip-sep6y`.

## Mac test prior (`cursor/live-ff-tip-sep6y`)

Platform-wide UI standards only: same upload drop-zone, trash delete, save toast → list, primary action, Columns picker, leftover funnel sort, row dividers, and status/temp badges. Rebased onto `cursor/live-ff-tip-sep6z` (`27a9ba3`), which already sits on `sep6x` / `sep6w`. No clock / follow-up / Operations nav / lead-detail docs / Deals checklist work. Leave sep6z Deals upload (`Choose file` + Add file) as-is. This tip adds no schema; `0079_documents_lead_id` is already on the branch from sep6x — migrate only if this desk is behind. No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6y && git pull
npm install
# skip db:migrate unless this desk is behind sep6x (`0079_documents_lead_id`)
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**, then **Contacts** or **Documents**.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Upload | Leftover file fields are **Choose files** plus a dashed drop-zone. Deals page upload stays sep6z **Choose file** / + Add file. Do not restyle lead-detail per-line cards. |
| 2 | Delete | File rows use the same trash-can on the right. Hover tints red. |
| 3 | Save | Save lead / contact / deal / business / claim shows the navy toast, then lands on that module’s list — never stays on the form. |
| 4 | Primary action | Save buttons are the same full-width primary. Secondary actions are text links under the button. |
| 5 | Columns | Leftover lists (Inspections, Campaigns, Logs, …) have the same **Columns** picker: checkboxes, drag-to-reorder, per-user widths. Existing Manage Columns still works. |
| 6 | Sort leftovers | Sheet leftovers use the same funnel → ASC/DESC popover. Name stays live search. Clock / follow-up unchanged. |
| 7 | Row dividers | Every `ff-table` row has a light horizontal border. Rows do not blend. |
| 8 | Badges | Status and Temp chips share one rounded-sm palette (Hot red, Warm amber, Cold blue). No leftover navy pills. |

## Mac test prior (`cursor/live-ff-tip-sep6z`)

Deals page only. Rebased onto lead-detail tip `sep6x` (`93e6178`) which already sits on clock/follow-up `sep6w`. Do not retouch lead detail, documents-per-line, or the clock. Title is **Deals** (no Personal Lines Worksheet). Stage chips above the table are gone. Upload block is on Table, Board, and Funnel: **Search deals** typeahead, **Choose file** button, filename + trash, **+ Add file**. P&C / Health / Life chips stay with expandable subs. Settings · Macros is off the deals toolbar. Row actions light Call / SMS / Text only with a phone, Email only with an email. Agents get **Change owner** with `Transfer this deal to {name}? They'll own all follow-ups from now on.` — receiver gets an in-app ping (deal name, who handed it over, tap to open). **Send quote** and **Add task** sit on the row. **Value** column uses premium / coverage amount. `data-sort`, `data-sheet-cell`, and `data-sheet-table-tax` are always strings (`""` when empty). View switcher is labeled **Pipeline** (Table / Board / Funnel). No new migrate on this tip. Their `0079_documents_lead_id` is already on the branch. No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6z && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Deals**.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Title | Header says **Deals**. No “Personal lines worksheet” caption on this page. |
| 2 | Stages row | No Stages chip row above the table. Stage still shows in each row’s Stage column. |
| 3 | Upload on every view | Table, Board, and Funnel all show the same Upload documents block in the same place. |
| 4 | Choose file | Control is a **Choose file** button — not “Choose Files” text. Picked file shows name + trash can. **+ Add file** adds another file on the same deal. |
| 5 | Search deals | Field labeled **Search deals**. Type a deal name, pick it, files attach. Filters this page only — not the global top-bar search. |
| 6 | LOB chips | P&C / Health / Life still expand (Home, Auto, Flood under P&C, etc.). |
| 7 | Toolbar | Settings and Macros are gone from the deals table toolbar. |
| 8 | Comms | Call / SMS / Text light only when the deal has a phone. Email lights only when an email exists. |
| 9 | Change owner | Agents see **Change owner**. Confirm reads `Transfer this deal to {name}? They'll own all follow-ups from now on.` |
| 10 | Transfer ping | Receiving agent gets a notification: deal name, who handed it over, one tap opens the deal. |
| 11 | Extra actions | **Send quote** and **Add task** are on the row. |
| 12 | Value | Table has a **Value** column (premium or estimated value). |
| 13 | Hydration | No null `data-sort` / `data-sheet-cell` / `data-sheet-table-tax`. Empty cells are `""`. |
| 14 | Pipeline | View switcher is labeled **Pipeline** with Table / Board / Funnel. |

## Mac test prior (`cursor/live-ff-tip-sep6x`)

Lead detail two-column layout, documents per line of interest, and one-click Lead ↔ Deal links. Rebased onto live clock/follow-up tip `sep6w` (`c42b4e2`) — clock / follow-up / Default templates / notification modal / Operations nav stay theirs. Additive `0079_documents_lead_id` only (nullable `documents.lead_id`). Line is stored on existing `documents.tags` as `line:home`. Their `0078_default_first_step_popup` is already on this branch. No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6x && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Open a Lead.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Two-column lead | Left is person + coverage. Right is Documents by line. Address / City / State / ZIP share one row. Email and Phone share one row. |
| 2 | Per-line cards | Home, Auto, and Flood cards are present (plus the desired line). Each is collapsible, has its own drop zone, starts with one file slot, and **+ Add file** adds another slot. |
| 3 | Upload + delete | Drop or pick a file on Home. It shows a name or thumbnail with a trash-can on the right. There is **no** global lead upload. |
| 4 | Convert carry | Convert the lead. The same file is on the deal under that line group. |
| 5 | Lead ↔ Deal | Lead top shows **View related deal**. Deal top shows **View source lead**. One click each way. |

## Mac test prior (`cursor/live-ff-tip-sep6w`)

Clock + Default-on-contacted + live delays + one app-root modal + snooze on every channel + compact funnel headers + notification checkboxes. Operations stays top-level admin-only; Customize stays free. Additive `0078_default_first_step_popup` only (Default first step → in-app popup). No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6w && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Clock starts on contacted | New lead stays `--:--`. Change status to **contacted** — within ~1s Response counts down `5:00`, `4:59`… and Follow-up shows **Default**. Do not pick Default first. |
| 2 | Countdown / red | Clock is black while counting. It turns **red only** at `0:00` if the agent has not acted. Completing or snoozing starts the next step and turns it black again. |
| 3 | Step fire + next | At zero the Default first step fires an in-app popup. Clock stays red at `0:00` until you complete or snooze — then it resets to the next live delay (30 min, then 2 hours, then 1 day). |
| 4 | Overrides | Aggressive / Steady / Drip replace Default for that lead. Switching back to Default restores contacted-linked Default. |
| 5 | Live delay | Edit Default first step 5 → 3 min and save. Pending Default clocks reschedule to **3:00** from now. |
| 6 | One modal | One notification modal at app root. New ping replaces content — never stacks, never a second copy after navigation. |
| 7 | Open lead | **Open lead** closes the modal and goes to that lead. Modal does **not** reappear on the lead page. Notification is not cleared. Leave without acting — it returns after **10 minutes**. |
| 8 | Mark as read | Closes completely. No blur / ghost on other pages. |
| 9 | Snooze | Pop-up, email stub, and follow-up task all have **15 min / 1 hour / 1 day** plus Custom. SMS keyword `Snooze 1h` is documented only. |
| 10 | Funnel headers | Leads, Deals, Contacts, Policies, Business, Carriers: small funnel → ASC/DESC popover. No ASC/DESC text in the header. Active funnel is filled. Name is live search only. |
| 11 | Notification checks | Bell panel and `/notifications`: every row checkbox and Select all start **unchecked**. Open lead / Mark as read do not check them. Bulk Mark selected as read is disabled until you check a box. |

## Mac test prior (`cursor/live-ff-tip-sep6t`)

Clock engine + one follow-up modal + Default mapped to **contacted** + live template delays. Table headers stay the compact funnel from sep6s. No sidebar / Deals / Contacts content change. Additive `0077_lead_follow_up_contacted` only (Default trigger → contacted). No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6t && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Clock starts on contacted | New lead stays `--:--`. Change status to **contacted** — within ~1s Response counts down `5:00`, `4:59`… and Follow-up shows **Default**. Do not pick Default first. |
| 2 | Countdown / red | Clock is black while counting. It turns **red only** at `0:00` if the agent has not acted. Completing or a new step turns it black again. |
| 3 | Step fire + next | At zero the step fires (pop-up / email / task). Clock resets to the next live delay (30 min, then 2 hours, then 1 day on Default). |
| 4 | Overrides | Aggressive / Steady / Drip replace Default for that lead. Switching back to Default restores contacted-linked Default. |
| 5 | Live delay | Edit Default first step 5 → 3 min and save. Pending Default clocks reschedule to **3:00** from now. |
| 6 | One modal | One notification modal at app root. New ping replaces content — never stacks, never a second copy after navigation. |
| 7 | Open lead | **Open lead** closes the modal and goes to that lead. Modal does **not** reappear on the lead page. Notification is not cleared. Leave without acting — it returns after **10 minutes**. |
| 8 | Mark as read | Closes completely. No blur / ghost on other pages. |
| 9 | Snooze | Pop-up, email stub, and follow-up task all have **15 min / 1 hour / 1 day** plus Custom. SMS keyword `Snooze 1h` is documented only. |
| 10 | Funnel headers | Leads, Deals, Contacts, Policies, Business, Carriers: small funnel → ASC/DESC popover. No ASC/DESC text in the header. Active funnel is filled. Name is live search only. |

## Mac test prior (`cursor/live-ff-tip-sep6s`)

Table header controls only: every sortable list column uses a compact funnel icon (ASC / DESC in a tiny popover). Name stays live search — no funnel. Source header stays **Source** (selected value lives in the popover, not the header). Shared `ColumnTable` path. No sidebar / data-model / page-content change. No migrate. No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6s && git pull
npm install
# skip db:migrate — header chrome only, no schema
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**, then **Contacts** or **Deals**.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Funnel per column | Sortable headers show a small funnel icon — no **ASC** / **DESC** text sitting in the header. |
| 2 | Sort popover | Click the icon → tiny **ASC** / **DESC** only. Pick one and the popover closes. Click away also closes. |
| 3 | Active sort | Idle icon is outline / muted. The sorted column’s icon is subtly filled. Header still shows the column name only. |
| 4 | Name search | Name has a live search field. Typing filters matching names immediately. No funnel / no ASC/DESC on Name. |
| 5 | Source | Header text is just **Source**. A selected value (Referral, ASC, …) never appears beside the label — only inside the open popover. |
| 6 | Other lists | Contacts, Deals, Policies, Business, Carriers use the same header chrome. |

## Mac test prior (`cursor/live-ff-tip-sep6r`)

Color standard plus Leads polish. Call / SMS / E-mail fills stay locked. Additive `0076_leads_sep6r_polish` only (template rename + reset Leads default widths). No AMS. No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6r && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**, then the bell.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Locked fills | **Call** `#7A5C18` mustard, **SMS** `#AC401C` rust, **E-mail / Email** `#101C34` navy. White labels. Same tokens on Leads and Calendar toolbar. Not the green / orange / teal legend. |
| 2 | Row dividers | Every Leads row has a light horizontal border. Rows do not blend. |
| 3 | Default widths | Fresh session (or after migrate) starts roomy — name + Call/SMS/E-mail, Temp, Follow-up, Response, Status are not crammed left. Drag-resize still persists per user. |
| 4 | Sort menu | Each sortable header has a small **ASC / DESC** dropdown. No up/down arrows. Idle shows no direction; picking one marks that column. |
| 5 | Template names | Follow-up dropdown: **Aggressive**, **Steady**, **Drip**, **Default**. Default uses Aggressive steps. Temp badges and chips stay **Hot** (red), **Warm** (amber), **Cold** (blue). |
| 6 | Notifications | Bell row: red check to mark read. Click a follow-up opens **that lead**. Copy like `Follow-up: Call Vazquez, Edmerson — due now.` Action line, lead name, timestamp. |
| 7 | Save lead | Save lead shows **Lead saved.** then lands on the Leads list — not the new-lead form and not the detail page. |
| 8 | Snooze lightbox | An in-app follow-up pop-up shows **Snooze** (number + hours/days). Confirm dismisses the lightbox and reschedules the same reminder. Refresh does not lose the snooze. Mark as read and Open lead still work. |

### Stub walls (paid APIs not wired)

- **Email / text send** — queued or held on `comms_outbound_jobs` with `vendor=stub` / `paid_api_wall`. Nothing leaves the desk.
- **Call** — in-app task + alert only. No trunk / PSTN. `tel:` opens the device dialer.
- **Agent pings** — `alerts` table only. Email remind-via is an agent stub and never emails Javy.

## Mac test prior (`cursor/live-ff-tip-sep6q`)

Platform-standard Call / SMS / E-mail action fills. Leads row buttons and Calendar toolbar Call / Email / SMS share `CONTACT_ACTION_COLORS` so they cannot drift. No schema or migrate.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6q && git pull
npm install
# skip db:migrate — colors only, no schema
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads** and **Calendar**.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Locked fills | **Call** `#7A5C18` mustard, **SMS** `#AC401C` rust, **E-mail / Email** `#101C34` navy. White labels. Not the green / orange / teal Calendar legend. |
| 2 | Leads row | Under the name / phone: **Call**, **SMS**, **E-mail** use those fills. Missing phone disables Call / SMS. Missing email disables E-mail. |
| 3 | Calendar toolbar | Row 3 **Call** / **Email** / **SMS** use the same tokens as Leads. Day / Today chrome stays unchanged. |
| 4 | One source | `CONTACT_ACTION_COLORS` + `contactActionButtonStyle` / `contactActionButtonClass`. Calendar `kindClass` for those three kinds points at the same class names. |

### Stub walls (paid APIs not wired)

- **Email / text send** — queued or held on `comms_outbound_jobs` with `vendor=stub` / `paid_api_wall`. Nothing leaves the desk.
- **Call** — in-app task + alert only. No trunk / PSTN. `tel:` opens the device dialer.
- **Agent pings** — `alerts` table only. Email remind-via is an agent stub and never emails Javy.

## Mac test prior (`cursor/live-ff-tip-sep6p`)

Leads overlay on sep6o plus the shared list-table standard (resize + sort). Follow-up editor is a 900px table. Default template is fourth. Response clock starts on first logged contact. Additive `0074_lead_follow_up_default` and `0075_list_column_layout` only. No AMS. No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6p && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**.

**Migrate only after checkout.** `0074_lead_follow_up_default` inserts the Default template (same four Hot steps + Remind via Task) and runs a scoped one-time data fix: stamp `first_contact_at` from the earliest logged call / email / sms when missing; reset status to `new` only for leads with no first-contact stamp and no logged comms (converted leads stay put); cancel queued follow-ups on those untouched new leads. The Leads page also runs the same fix idempotently. `0075_list_column_layout` adds `desk_column_prefs.widths` and `.sort` on the same per-user row as Manage Columns — no second prefs system. Do **not** `db:seed` or wipe the Zoho book.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Follow-up template editor table | **Follow-up Templates** → Edit. Modal is ~900px. Steps are a **table**: Method · Delay · Unit · Remind via · Message. Four steps = four rows. No Skip field. No inner scroll for the steps. |
| 2 | Response clock | Every lead row has a **Response** clock. Idle is `--:--` until you log Call / SMS / E-mail. After first logged contact the clock counts from that stamp, not arrival. Leads with zero logged contacts and no first-contact stamp are status **new**. |
| 3 | Default template | Follow-up dropdown is **Hot**, **Warm**, **Cold (not interested)**, **Default** (fourth, bottom). New leads run Default until the agent overrides. Default steps match Hot: call 5 min, text 30 min, email 2 hours, call 1 day. |
| 4 | Filter chips | Top chips All · Hot · Warm · Cold. Hot is red, Warm amber, Cold blue — same as Temp badges. Selected chip has a stronger fill + ring. |
| 5 | Column picker | **Columns** on the right reads as **Columns**, not a stray **CO**. Checkbox labels are clean column names only (Name, Status, Source, Response, Temp, Follow-up, Convert). No empty / Select artifact. |
| 6 | Lead row contact buttons | Under the name / phone: three real buttons **Call** (yellow), **SMS** (flag orange), **E-mail** (navy) — same `ff-cal-*` colors as Calendar. Missing phone disables Call / SMS. Missing email disables E-mail. Click logs first contact and opens tel: / sms: / mailto:. |
| 7 | Shared table resize + sort | On **Leads** and every other list that uses the shared Columns table (Deals, Contacts, Policies, Carriers, Tasks, …): drag either header border to resize; widths persist per user on `desk_column_prefs`. Every labeled header has an asc/desc mark on the right. Click cycles inactive → A→Z → Z→A → clear (same as existing sheet sort). Prove it on Leads **and** Contacts or Deals — one chrome, not a Leads fork. |

### Stub walls (paid APIs not wired)

- **Email / text send** — queued or held on `comms_outbound_jobs` with `vendor=stub` / `paid_api_wall`. Nothing leaves the desk.
- **Call** — in-app task + alert only. No trunk / PSTN. `tel:` opens the device dialer.
- **Agent pings** — `alerts` table only. Email remind-via is an agent stub and never emails Javy.

Due follow-ups land on **Tasks** (`activities` kind=task) and the in-app bell. Sidebar and nav are unchanged. Calendar Call / SMS / Email toolbar buttons use the same shared color source as Leads. Deals / Contacts / Policies list chrome picks up resize + sort from the shared `ColumnTable` — not a Leads fork. Sheet/`Col` tables already had header sort via `ff-sheet`; they are not the Leads-style Columns table.

## Mac test prior (`cursor/live-ff-tip-sep6o`)

Leads follow-up + column picker standard on top of sep6n. Hot / Warm / Cold temp and timer-on-first-contact stay. Additive `0073_lead_follow_up_remind_nurture` only. No AMS. No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6o && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**, then the other list pages.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Rename columns | Leads headers are **Follow-up** (was Template) and **Convert** (was Shop). Convert button still starts the shop. |
| 2 | Remind via on every template step | **Follow-up Templates** → edit Hot, Warm, or Cold (not interested). Each step has **Remind via**: Task · Pop-up · Email. Save persists. Task / Pop-up notify in-app when the step fires. Email is an agent-reminder stub held at the send wall — nothing emails Javy. |
| 3 | Follow-up dropdown | Row **Follow-up** select has exactly four options, in this order: **Hot**, **Warm**, **Cold (not interested)**, **Default** (bottom). No “Automatic.” Default uses the template linked to the lead’s current status. Hot / Warm / Cold are a per-lead override. |
| 4 | Nurture status + date picker | Status list includes **Nurture**. Choosing it opens a pop-up: when to contact again (number + days/months, max 1 year) and how to remind (Task / Pop-up / Email). Lead leaves the default queue and resurfaces on that date with the chosen reminder. |
| 5 | Lost status | Status list includes **Lost** (bad number, not a fit, never responds). Lost leads are hidden from the default Leads view. Type a name in Search — they still appear. Global search still finds them. |
| 6 | Column picker | Every list (Leads, Deals table, Contacts, Policies, Businesses, Carriers, plus Tasks / Claims / Quotes table / Pipeline table / Commissions / Reviews / Work queue / Glance / Merge) shows a **Columns** button (not “Manage columns”). Checkbox list. Checked items drag to reorder. Order is saved per user. |

### Stub walls (paid APIs not wired)

- **Email / text send** — queued or held on `comms_outbound_jobs` with `vendor=stub` / `paid_api_wall`. Nothing leaves the desk.
- **Call** — in-app task + alert only. No trunk / PSTN.
- **Agent pings** — `alerts` table only. Email remind-via is an agent stub and never emails Javy.

Due follow-ups land on **Tasks** (`activities` kind=task) and the in-app bell. New Lead form, sidebar, and other pages are unchanged except the shared Columns control on lists.

## Mac test prior (`cursor/live-ff-tip-sep6n`)

Leads follow-up templates on top of sep6m. Timer starts on first contact, not arrival. Temp is Hot / Warm / Cold. Templates are a centered ~600px modal. Additive `0072_lead_follow_up_warm_cold` only. No AMS. No seed wipe.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6n && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Timer starts on first contact | New lead in status **new** shows `--:--` — no clock. Wait 30s (or longer). Nothing fires. Log call / text / email on the row — timer starts from that stamp. Hot first step (5 min call) is due from contact, not arrival. No phantom Tasks while the lead sits untouched. |
| 2 | Temp Hot / Warm / Cold | **Temp** column (not Hot/Cold). Three states: Hot red, Warm amber, Cold blue. Brand-new lead is **Hot**. Row hover is **neutral gray** — never the badge color. Filter chips: All · Hot · Warm · Cold. |
| 3 | Three status-linked templates | Hot fires when status = **new**. Warm when status = **warm**. Cold (not interested) when status = **cold**. Status change auto-swaps the matching template. Per-lead Template dropdown override; default Automatic. Full name **Cold (not interested)** in the editor; chips stay Cold. Status list is additive (warm / cold added; new / contacted / in-progress / recycled stay). |
| 4 | Template editor modal | **Follow-up Templates** opens a centered ~600px modal, not a right slide-out. Steps are one row each: Method, Delay, Unit (min / hours / days), Message. Four steps visible without scrolling chrome. Max 4 steps. Save with name; each template maps to one status. Delete still asks twice. |
| 5 | Column labels | Header **Temp** (was Hot/Cold). Header **Template** (was Follow-up). Cell shows the actual template name (**Hot** / **Warm** / **Cold**), not “Automatic.” |

### Stub walls (paid APIs not wired)

- **Email / text send** — queued or held on `comms_outbound_jobs` with `vendor=stub` / `paid_api_wall`. Nothing leaves the desk.
- **Call** — in-app task + alert only. No trunk / PSTN.
- **Agent pings** — `alerts` table only. Nothing emails Javy.

Due follow-ups land on **Tasks** (`activities` kind=task) and the in-app bell. New Lead form, sidebar, and other pages are unchanged.

## Mac test prior (`cursor/live-ff-tip-sep6m`)

Leads overlay fixes on top of sep6l. No `<script>` in the Leads React tree (`ff-sheet.js` loads via `next/script`). Response timer SSRs `--:--` until mount, then ticks on the client — no hydration mismatch on the 5-minute first-contact clock.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6m && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Hard refresh **Leads**. Confirm no script-tag console error and no hydration overlay on the response timer.

| # | Check | Pass when |
| --- | --- | --- |
| 1 | Converted off Leads | Convert a lead. It disappears from Leads immediately and is only on Deals. No “show converted” toggle. Queue shows new / contacted / in-progress / recycled only. |
| 2 | Sort + filters | Untouched (new, no contact) sit first, then newest arrival. Status, Source, and Hot/Cold replace saved-filter macros. Type a name — list filters live and shows “N matches”. No Settings · Macros link. |
| 3 | Follow-up templates | **Follow-up Templates** opens a right slide-out. Seeded: Hot Lead (call 5m, text 30m, email 2h, call 1d) on **new**; Not Interested (email 30d / 60d / 90d) on **recycled**. Change status — matching template queues Tasks automatically. Override per lead with the Follow-up dropdown. Delete template asks twice. |
| 4 | Response timer | New lead shows elapsed time from arrival. Turns **red after 5:00** with no first contact. Log call / text / email on the row — timer clears. |

### Stub walls (paid APIs not wired)

- **Email / text send** — queued or held on `comms_outbound_jobs` with `vendor=stub` / `paid_api_wall`. Nothing leaves the desk.
- **Call** — in-app task + alert only. No trunk / PSTN.
- **Agent pings** — `alerts` table only. Nothing emails Javy.

Due follow-ups land on **Tasks** (`activities` kind=task) and the in-app bell. New Lead form, sidebar, and other pages are unchanged.

## Mac test prior (`cursor/live-ff-tip-sep6k`)

Same as sep6j plus no top-level Flood chip. Flood stays a P&C subtype only.

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6k && git pull
npm install
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Hard refresh. Deals chips: All · P&C · Health · Life | Won-Lost · Archive. P&C opens Home / Auto / Flood / Commercial. No primary Flood chip.

## Delete file on every upload surface (prior tip)

**`cursor/live-ff-tip-sep6i`** is **`cursor/live-ff-tip-sep6h`** (`5cda4fc`) plus Delete on every upload surface. No page redesign. Menu unchanged. No AMS. No seed. No wipe. PDF ingest from sep6h is unchanged.

Every upload surface that keeps a file now has **Delete** (or **Hide** on issued policy files) on the same row. Hard delete always asks twice: `Are you sure you want to delete …?` ×2. After a shopping-doc delete the file leaves storage and the DB row, extract rows for that file are removed, and Quote Sheet cells that only came from extract / photo-OCR clear, then fill re-runs from remaining source docs.

Issued policy files (`policy_file` / issued dec / complete / ID) are **hidden for retention**, not wiped.

### Air checkout (skip seed)

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6i && git pull
npm install
# optional but faster rasterize on the Mac mini:
# brew install poppler
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

Login **javy@fitfirst.local** / **javy**. Open a Deal → Documents. Each source-doc row has Delete. Confirm twice. The row disappears. Quote Sheet extract cells from that file clear. Re-upload a dec / 4-point / wind mit still fills the sheet (sep6h ingest).

## Quote Sheet PDF ingest (prior tip)

**`cursor/live-ff-tip-sep6h`** is **`cursor/live-ff-tip-sep6g`** (`97c2068`) plus PDF text-layer extract and rasterize-then-OCR. No page redesign. No nav change. No seed. Do not seed Ana. Do not bind Ana. Cov A stays **$321,000**.

Upload of a former dec + 4-point + wind mit was leaving the HO Quote Sheet almost empty (`Pdf reading is not supported` / Tesseract fed raw PDF bytes). Ingest now:

1. Detects PDF by mime, `.pdf`, or `%PDF` magic — even if the browser labeled it an image.
2. Extracts the text layer first (`pdf-parse` implementation file, pdfjs `getTextContent`, `pdftotext` when installed).
3. If the layer is empty (scan), rasterizes pages (`pdftoppm` or pdfjs + canvas) and OCRs the **PNG**s. Raw PDF never goes to Tesseract.
4. Same fillDealSheet / yellow-blue glance UX. CHECK = use the value. Only genuine low-confidence fields stay Needs review.

### Re-test on the live deal

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6h && git pull
npm install
# optional but faster rasterize on the Mac mini:
# brew install poppler
npm run db:migrate
# skip db:seed — keep the live Zoho book
npm run dev -- --port 43147
```

1. Sign in **javy@fitfirst.local** / **javy**.
2. Open deal `f2b63b87-c183-4681-8469-3072455b6dd1` → Documents (or Quote Sheet).
3. Re-upload the former dec + 4-point + wind mit, **or** on each source file use extract / Fill from source docs.
4. Quote Sheet should show a **majority** of HO fields as Confirmed or Needs review with real values — not almost-all Missing.
5. Ana Dib HO3 stays shopping / unbound / Cov A **$321,000**. Do not bind.

```bash
npm test
```

## Signed default rail + free customizer (this tip)

**`cursor/live-ff-tip-sep6f`** is **`cursor/live-ff-tip-sep6e`** (`1ab3f69`) plus menu-structure only: Policies kids and Admin → Operations. No page redesign. No AMS. No new migration. No seed. Do not seed Ana. Keep Zoho scripts. Do not wipe the book.

Default rail, top → bottom: **Home**, **Leads** (no kids), **Deals** (no kids — Quotes is a Deal detail tab only), **Contacts** (no kids), **Policies** (My Book / Renewals / Certificates — parent click lands on My Book), **Business** (collapsed), **Carriers** (collapsed), divider, then **Tasks** (no kids), **Calendar** (no kids), **Templates** (email signatures / email templates / document templates), **Reports** (no kids), **Settings** (agency, admin only, empty kids), **Admin** (admin only: People, Integrations, Automations, Triggers, Commission rates, Lines of business, Offices, Agency chrome), **Operations** (admin only, own top-level row). Operations children (admin only): Billing, Claims, Endorsements, Compliance, Carrier Downloads, Book of Health, Book of Life, Marketplace. Customize can nest or promote any folder — kids stay with the folder. Agents never see Settings, Admin, Operations, or anything inside Operations. `NAV_LAYOUT_VERSION` is **9**; older per-user `nav_layout` blobs reset to this rail (personal timezone / signature prefs are kept). No `db:seed` / no Zoho wipe.

Profile avatar (top right): **Edit Profile**, **Password**, **Settings** (`/me` — personal only), **Sign Out**. **Switch role** stays for Admin view-as and writes `role_switch` to the E&O trail.

Collapse control sits **between the logo / desk name and the menu list**. Utility rows (Tasks → Admin) stay pinned so they do not scroll away. Collapsed rail is icon-only with tooltips.

Customize menu: drag the **row itself** (no grip, no chevron while customizing). **Add link** is one control next to **Done customizing** — new rows land at the end of primary, then drag them. White bar / folder highlight is the only drop chrome (no per-folder nest banners or Add-link dropdowns). The customize list scrolls; Done and Reset stay pinned. **Reset to default** restores the structure above. Layout stays per user on `agent_ui_prefs.nav_layout`.

## Leads Actions Delete + shared menu width (this slice)

**`cursor/ff-leads-actions-delete-fb86`** — folded onto **`cursor/live-ff-tip-sep5f`**, then carried onto **`cursor/live-ff-tip-sep6b`**. No migration. No seed. No wipe.

1. **Leads selection Actions** includes **Delete** (same list menu as Tasks). Double-confirm, then the lead row is removed. Linked shops stay (deal `lead_id` is cleared). Ana stays locked.
2. **Actions dropdown** is `w-max` / `min-w-max` with no wrap on items, so every option sits on one line. Shared `DropdownMenu` + `SelectionActionsMenu` — every module list, not only Leads.
3. **Hard delete always asks twice** (`Are you sure you want to delete …?` then a permanent-delete confirm). Archive stays a single confirm.
4. **Policies / carriers / businesses / contacts / deals** do not get list Delete. Policies stay for retention (lapse or cancel on the file). Prefer Archive on people + deals.

### Air checkout (skip seed)

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6f && git pull
npm install
npm run db:migrate
# if owners still null after prior import:
npm run db:assign-owner
npm run dev -- --port 43147
```

Do **not** run `db:wipe-crm` or `db:seed` if the live Zoho book is already loaded. This slice adds no table.

Then Chrome [http://localhost:43147](http://localhost:43147). Login **javy@fitfirst.local** / **javy**. Leads → tick a row → **Actions** → **Delete** (two confirms). Open Actions on Contacts / Policies and confirm the menu is wide enough that labels do not wrap. Policies still have no Delete.

## Empty Policies submenu + Leads no-dec (this slice)

**`cursor/ff-policies-empty-default-c8b0`** + **`cursor/ff-leads-remove-dec-drop-a688`** — folded onto **`cursor/live-ff-tip-sep6b`**. No migration. No seed. No wipe.

1. **Policies** is a top-level rail row with no default children. Book health, Renewals, Certificates, and other AMS destinations stay addable in Customize — they are not nested under Policies by default. `NAV_LAYOUT_VERSION` is **4**.
2. **Leads** has no Drop a dec packet card. Agents create or match a lead (name + phone or email). Source docs (dec, wind mit, 4-point) drop on the Deal only.

## Live typeahead search (this slice)

**`cursor/ff-live-typeahead-search-d2d4`** — top chrome search fills as you type (200ms debounce). No Search click. Contains-match across **contacts, leads, deals, businesses, policies, and carriers**. Arrow keys + Enter open a hit; “See all results” still goes to `/search`.

The same live-contains box sits on module lists (Leads, Contacts, Businesses, Policies, Carriers, Deals, Quotes, Tasks, Claims, Work queue). Typing filters the list immediately. Named dropdown filters are unchanged. Does **not** wipe the book.

Try: type `javy` in the header. Book names appear live. Same box on Contacts / Deals / Policies filters the sheet as you type.

## Tip branch

**`cursor/live-ff-tip-sep6f`** — `cursor/live-ff-tip-sep6e` @ `1ab3f69` plus Admin **Operations** folder (last under Admin, admin only) and Policies kids **My Book / Renewals / Certificates**. `NAV_LAYOUT_VERSION` **6**. No AMS. No seed. Still includes:

1. **`cursor/ff-manage-columns-everywhere-8fac`** — Manage columns on every CRM data sheet (`DeskColumnTable` / `desk_column_prefs`).
2. **`cursor/ff-remove-stubs-6086`** — drop demo theater (Get Started / Inbox / Support out of the rail; honest Connect walls).
3. **`cursor/ff-nav-dnd-customize-fe86`** — drag-and-drop left nav. Primary order + editable submenus persist on `agent_ui_prefs.nav_layout`. Default rail stays stub-free.
4. **`cursor/ff-selection-actions-dae2`** — tick rows for Duplicate / Merge / Email / SMS / Print / Run macro / Archive / Delete. Call stays off. Leads + Tasks hard-delete (double confirm) is on **`cursor/ff-leads-actions-delete-fb86`**.
5. **`cursor/ff-deal-name-typeahead-b1c0`** — Deal Name typeaheads Contacts + Businesses as you type (name / email / phone). Pipeline create and Deals upload use the same picker.
6. **`cursor/ff-deal-upload-half-88fe`** — Deal Documents upload is half width; the right half is a live shop desk (person, email/call, sheet status, collect-next, open activities).
7. **`cursor/ff-deals-merge-pipeline-b3cc`** — Deals and Pipeline are one module. Pipeline is gone from the left nav. `/pipeline` redirects to `/deals` and keeps the query. Table / Board / Funnel share the same filters (P&C, Health, Life, Flood, Won-Lost, Archive). Stored customize ids named `pipeline` remap to `deals`.
8. **`cursor/ff-nav-hide-items-d507`** — hide or show any primary rail module. Settings stays pinned and unhidable. Visibility lives on the same `nav_layout` blob as reorder.
9. **`cursor/ff-live-typeahead-search-d2d4`** — header Smart Search typeaheads the book as you type. Module list filters use the same live-contains box.
10. **`cursor/ff-leads-actions-delete-fb86`** — Leads list Delete (double confirm; shops stay; Ana locked). Shared Actions dropdown is `w-max` so labels do not wrap. Hard delete asks twice everywhere.
11. **`cursor/desk-nav-shell-1e87`** — signed default rail: Home, Leads, Deals(+Quotes), Contacts, Policies (empty), Business collapsed, Carriers collapsed, divider, Tasks, Calendar, Templates(+3), Reports, Settings admin, Admin admin. Profile dropdown personal settings, Switch role audit, free DnD customizer, Reset to default. AMS catalog rows stay addable.
12. **`cursor/ff-policies-empty-default-c8b0`** — Policies has no default submenu. AMS destinations stay in the Customize catalog.
13. **`cursor/ff-leads-remove-dec-drop-a688`** — Leads list no longer has Drop a dec packet. Create or match a lead on `/leads`; dec / wind mit / 4-point drops stay on Deals.
14. **`cursor/live-ff-tip-sep6c`** — `NAV_LAYOUT_VERSION` **5**. Default Tasks / Calendar / Reports have no kids. Customize: drag the row (no grip / no chevron). Nest and promote both work. Collapse control is between the logo and the menu. Utility + profile stay pinned.
15. **`cursor/ff-nav-customize-chrome-d626`** / **`cursor/live-ff-tip-sep6d`** — Customize list scrolls (Done + Reset pinned). One Add link at the bottom. No nest banners, no per-folder Add-link dropdowns. Drag the tile; white highlight only. No grip, no customize chevrons. Collapse between logo and menu.
16. **`cursor/ff-lead-deal-worksheet-2338`** — Lead detail is Convert-first (no Ask a teammate / activity timeline). Deal worksheet header is name / stage / line / source. Source docs accept multiple files; sheet-health strip is Confirmed / Needs review / Missing.

Skipped for the next tip: AMS waves 10–16. No AMS on this merge. No Policies submenu guess.

Demo theater is off. Paid APIs (IVANS, Twilio SMS, email/social OAuth, Stripe) are honest Connect / Settings walls — no fake Connect toggles. CRM, Quote, Settings, Import/Export + Zoho JSONL, and macros stay. Sidebar stays `#1d4e89` with off-white active rows. Notification bell stays in top chrome. Live Zoho is book of record — no live Zoho writes. Quotes never create a Policy. After wipe+import, Ana is usually gone; if demo Ana remains, Cov A stays **$321,000** unbound.

### Nav items kept off the rail

| Removed | Was | Why |
| --- | --- | --- |
| Get Started | `/get-started` | Demo seed checklist. Bookmarks redirect to Home. Not in the Add-link catalog. |
| Inbox | `/inbox` | No mailbox. Header Mail opens Settings → Email. Not in the Add-link catalog. |
| Support | `/support` | Coming-soon stub. In-app help panel stays. Not in the Add-link catalog. |

Social stays under Home as a BYO connect wall (Settings → Social). Phone stays under Calendar as a call log.

## Run locally (Mac Air and Mac mini)

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-ff-tip-sep6f && git pull
npm install
npm run db:migrate
# if owners still null after prior import:
npm run db:assign-owner
# skip db:seed — keep the live Zoho-imported book
npm run dev -- --port 43147
```

Then Chrome [http://localhost:43147](http://localhost:43147). Login **javy@fitfirst.local** / **javy**. Function first; no redesign. Do **not** run `db:wipe-crm` or `db:seed` on a live book.

### Selection Actions (this slice)

Tick one or more rows on Leads, Contacts, Deals, Policies, Businesses, Carriers, Tasks, or Campaigns. **Actions** appears on the list bar:

- **Duplicate** — copies Leads, Contacts, Deals, Businesses, Tasks, Campaigns. Policies and Carriers stay off (bind / shared book).
- **Merge** — 2+ Leads or Contacts opens the existing merge review (first two if you pick more).
- **Email / SMS** — compose queues the in-desk outbound job + activity. Disabled when the selected rows have no address.
- **Call** — disabled. Connect later is not a live trunk.
- **Print** — browser print of the current sheet (sidebar/header hidden).
- **Run macro** — Settings macros already wired on the list.
- **Archive** — Leads, Contacts, Deals leave the list (`archived_at`). Not a wipe.
- **Delete** — Leads and Tasks, after two confirms. Policies stay for retention (no list wipe). Contacts / Deals / Businesses / Carriers stay Archive-or-off.
- **Convert** on Leads (starts a shop). **Bind** on Deals opens the existing bind path, or the bound policy when one exists.

Ana Dib stays locked. No fake “would send” clicks.

### Left nav customize (this slice)

Default rail: **Home · Leads · Deals · Contacts · Policies · Business · Carriers**, then a divider, then **Tasks · Calendar · Templates · Reports · Settings · Admin**. Quotes stay under Deals. Tasks, Calendar, and Reports have no default children. Business and Carriers start collapsed. Settings and Admin are **admin only**. Personal profile / password / signature live under the top-right avatar, not the rail. Pipeline is Deals — there is no second rail row.

1. Click the **label** to open that module. Outside Customize, click the **chevron** to expand a folder that has kids. Only one submenu is open at a time.
2. Collapse / expand sits **between the logo / desk name and the menu list**. Icon rail shows tooltips. Utility rows (Tasks through Admin) stay pinned at the bottom.
3. **Customize menu** at the bottom of the rail. Drag the **row** — no grip, no chevron while customizing. One **Add link** next to Done; the list scrolls so Done stays visible. Nothing is locked. Drop onto a folder (highlight) to nest; drop on a white bar to place between or promote. Eye still hides a primary while you edit.
4. **Reset to default** restores the factory structure above (still no demo stubs). `NAV_LAYOUT_VERSION` **6** resets older saved rails.
5. Layout is per signed-in user on `agent_ui_prefs.nav_layout` (`actor_key = user:<id>`). Survives refresh. Maya’s menu stays hers.
6. Last-open + icon rail still use `localStorage` (`ff-sidebar-accordion:v1`). Color stays `#1d4e89`. Work queue, Phone, Scorecards, Glance, Commissions, and AMS rows stay in the catalog — they are **not** default children.

### Air checkout (no wipe, skip seed)

```bash
git fetch && git checkout cursor/live-ff-tip-sep6f && git pull
npm install
npm run db:migrate
# if owners still null after prior import:
npm run db:assign-owner
npm run dev -- --port 43147
```

Do not run `db:wipe-crm` or `db:seed` if the live Zoho book is already loaded. This delete/UX slice adds no table. Live typeahead search also adds no table — `db:migrate` only if this desk is behind (nullable `agent_ui_prefs.nav_layout` / `0070_nav_layout`). Hide is a JSON field (`hiddenPrimaryIds`) on that same blob. Manage columns uses `desk_column_prefs` (already on sep5c). If Maya’s lists are empty from an older import, `npm run db:assign-owner` only.

### Manage columns (this slice)

The sliders icon on the last table header is **Manage columns**. Same shared `ColumnTable` on Leads, Deals (table view), Contacts, Businesses, Policies, Carriers, Tasks, Quotes, Claims, Glance, Reviews, Merge, Commissions, and Work queue. Toggles write `desk_column_prefs` per user / tenant / table and cache in `localStorage`. Locked columns (select, name, Deal title, e-sign) stay on. Deals **board** still uses Deal details for card fields; the table view uses Manage columns. Sidebar stays `#1d4e89`.

### Deals = Pipeline (this slice)

1. Sign in as **javy@fitfirst.local** / **javy**.
2. Left nav **Deals**. There is no Pipeline row.
3. Table is the default. Same list as before — columns, comms, upload.
4. Filter chips: **All · P&C · Health · Life · Flood · Won-Lost · Archive**. Board | Table | Funnel on the right.
5. Open Board or Funnel on P&C. Funnel **Quote Sent** opens Table filtered to that stage.
6. Old `/pipeline?pipeline=p-c` bookmarks land on `/deals?pipeline=p-c`.
7. Confirm Ana is still unbound, Cov A $321,000. Do not bind her.

### Home custom layouts + corner resize (this slice)

1. Home (signed in as **javy@fitfirst.local** / **javy**).
2. **Layout** (same outline dropdown as Book) → pick a preset, or **Save as custom layout…**, name it, then pick it later. **Rename current layout…** while a custom layout is active.
3. **Widget settings** → check **Resize tiles** → pull the bottom-right corner of any card. Neighbors keep their size. Preset chips still work.
4. Management lead offers still show language / state (Montana licensed producers). After wipe+import the book is Zoho data, not the Ana demo.

First-time only: `cp .env.example .env`. Postgres on `DATABASE_URL` (default `postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst`). `docker compose up -d db` if you need the local database.

Demo login (MFA bypass): **javy@fitfirst.local** / **javy** (Admin) or **maya@fitfirst.local** / **maya** (Agent). Switch users from the top-right avatar **Switch role** (Admin) or `/login`.

## Zoho JSONL import (Air desk — records only)

On this tip. Javy dual-enters: FitFirst live test + Zoho backup. Wipe demo CRM rows and load a Zoho MCP dump. It does **not** call paid APIs. Login, tenant, Home layouts, and existing FitFirst carriers stay. Ana is not re-seeded after wipe.

One file per module: `Contacts.jsonl`, `Accounts.jsonl`, `Leads.jsonl`, `Deals.jsonl`, `Vendors.jsonl`, `Policies.jsonl`, `Tasks.jsonl`. Each line is a Zoho `getRecords` row (or a `{ data: [...] }` page). Vendors merge into carriers by normalized name — no duplicate carriers; new names are added. The importer prints counts and unmatched Zoho fields. Files/attachments stay out. Settings → Import / Export shows whether those JSONL files are present. First-time empty Postgres still needs one `db:seed` to create login users, then wipe+import. An Air desk that already has **javy** skips seed.

### Air note — empty agent lists after Zoho import

Zoho `Owner` was ignored, so `contacts` / `leads` / `deals` / `policies` landed with `owner_id` NULL. Agent sessions filter `ownerWhere` to their user id (unsigned → `false`), so Maya saw empty lists while Javy (admin) saw the book.

**Fix (no wipe):**

```bash
git fetch && git checkout cursor/ff-zoho-owner-fix-6b9e && git pull
npm run db:assign-owner
```

That UPDATE-only script sets null `owner_id` (and `created_by` / `created_by_user_id` if those columns exist) to **javy@fitfirst.local** / `44444444-4444-4444-8444-444444444401`. New imports map Zoho Owner by email, then name, then that same admin fallback. Re-import is optional; do **not** run `db:wipe-crm` just to fix owners.

## Pipeline views + status colors (this slice)

Overnight feel-pass: grouped left nav, named list filters, header column sliders, RecordContextRail, Start Shop, in-desk calendar, quick comms, Choose files, floating Support, settings accordion, widget resize chrome, Ask a teammate, HTML 404s.

Typography: full desk scale-up on a **16px** root. Tailwind `text-sm`/`base`/`lg`/`xl` sit one step larger (15 / 17 / 20 / 22px). Helper **15px**, caption **14px**, `--ff-muted` **#3f4e5c**. Buttons/inputs default **h-9**. Nav items **15px** on a `w-60` rail. Tables **16px**. Leftover 10–13px classes remap through the shared tokens.

Home tiles: drag the grip to reorder. **Layout** dropdown keeps the three presets and adds **Custom layouts** — name the current board, switch it later, rename it later. Named layouts live on `user_dashboard_prefs.custom_layouts` (per user / tenant). Widget settings → **Resize tiles** shows a corner handle on each card; pull it to stretch or shrink that tile only. Preset sizes stay as chips (**1×1 / 1×2 / 1×3 / 2×1 / 2×2 / 3×1 / 3×2 / 4×1 / 4×2**). Working sizes also cache in `localStorage` as `ff-home-layout:v1:<book>` (and `:custom:<id>` when a named layout is active). **Reset tile layout** is in Widget settings. Line-of-business donut stays 68px. Language / license lead offers are unchanged.

Today’s batch4 surface: darker blue sidebar (`#1d4e89` / `--ff-sidebar-blue`), admin/agent actor switcher, rich home widgets (contest, lead offers, hit/lost, KPIs, birthdays, renewal risk, mix donut, book scope), Documents / ACORD library, offices + territories, Social/GBP BYO connect, carrier portal login admin, login/session/MFA.

**Automations** is in-desk only. Playbooks fire Tasks and in-app Alerts (renewal 60/30, Closed Won, Quote Sent, birthday). Template library is EN/ES preview — nothing sends. No Twilio / SendGrid / paid campaign vendors. Admin writes playbooks; agents see their book. Internal pings stay on the top-right **notification bell**, the **Notification board** (`/notifications`), and the playbook pop-up. Nothing emails Javy.

## Notification bell + board (this slice)

Top-right Home / shell **bell** (orange, next to Mail) opens a **scrollable** panel. First row is **Notification board**. Recent in-app alerts sit below. **Mark as read** is per row; **Mark all as read** clears the badge. A row deep-links to the tagged record when one exists (policy, claim, playbook, …). `/alerts` redirects to `/notifications`. No email.

### Click path

1. Sign in as **javy@fitfirst.local** / **javy**.
2. Home — top-right orange **bell**. Badge is the unread count.
3. Click the bell. Panel opens. First row: **Notification board**.
4. Below that, recent pings. Click a title to open the record. **Mark as read** on the row, or **Mark all as read**.
5. First row (or left-nav Alerts) changes the screen to `/notifications` — every in-app ping, same mark-read actions.
6. Confirm nothing mailed Javy. Do not bind Ana.

**Import / Export** (Admin only): [http://localhost:43147/settings/import-export](http://localhost:43147/settings/import-export) — CSV export, templates, and dry-run import for Leads, Contacts, Businesses, Deals, Policies, Carriers, plus export (or stub import) for activities, notes, documents, commissions, quotes, users, pipelines, and appetite/decline logs. No paid migration vendor. IVANS/AL3 stays a Not-connected stub.

AMS desk: file endorsement / cancel / non-renew on the Policy with a clear outcome. Renewal compare shows dollar and percent premium change. Work queue lists flags, notes, assignee, and in-app pings (addressed to the assignee). Claims log is a three-column FNOL board. Commissions split pending (still owed) vs paid. Missing-data gauges link to the Quote Sheet cell.

**Integrations** (`/settings/integrations`): same chrome as the catalog. Social / GBP is BYO OAuth (see below). Other cards stay Demo Connect / Disconnect for Google, Outlook, Zoho Mail/Calendar, SMS, e-sign, and EZLynx / QuoteRush. Copy is **Agency pays the vendor.** No Stripe or Twilio. GBP gate stays on Settings → Social. Linked from Settings.

## Social BYO connect (this slice)

Javy can try connecting Facebook / Instagram / GBP / LinkedIn **without FitFirst buying** Meta, X, or Google APIs. Admin pastes the agency’s own free developer app on **Settings → Social** or the Social section of **Settings → Integrations**.

| Platform | What works | What is stubbed |
| --- | --- | --- |
| **Facebook** | Paste Meta App ID + App Secret. **Connect with Facebook** opens Meta’s real OAuth dialog. Callback exchanges the code with the agency secret. Status **Connected (BYO)**. | Page inbox sync, lead-form pull, ads / Marketing API. Pulse stays demo seeds. |
| **Instagram** | Same Meta app (or its own). Real OAuth. Can reuse Facebook credentials if IG fields are empty. | DM / comment ingest. Nothing posts. |
| **Google Business Profile** | Paste Google Cloud OAuth client. **Connect with Google** opens Google OAuth (`business.manage`). Userinfo label if Google returns it. Admin GBP monitor gate unchanged. | Listing replies / views API. Google verification is their wall. **Maps stay free public search links** (property address → Google Maps / Zillow / FEMA). Not a Maps Platform seat. |
| **LinkedIn** | Paste LinkedIn app. **Connect with LinkedIn** runs free Sign In (OpenID). | Company-page inbox and Community Management (partner / paid). |
| **X (Twitter)** | Credentials can be saved. **Connect** stops at the paid-API wall. | Mentions / DMs. FitFirst does not buy X API. |
| **Desk demo** | **Mark connected (desk demo)** still flips pulse seeds (Priya Instagram lead path) without any vendor app. | Same as before — no OAuth. |

Redirect URI to add on the agency app: `{desk origin}/api/social/oauth/callback` (local: `http://127.0.0.1:43147/api/social/oauth/callback`). Secrets encrypt at rest. FitFirst never ships Meta / X / LinkedIn keys.

Settings is Setup-style **card groups** (Agency & People, Desk & Phone, Integrations / Connect, Automations & Developer, Security, Import / Export, Billing stub) — not one endless left rail. Phone and agency stay under the Admin Settings group. Automations and Developer Hub share **one** Setup card. Platform macros appear once (`/automations/macros` list; editor `/settings/developer-hub/macros`) on the same `desk_macros` rows — pick target modules (Leads, Deals / Pipeline, Contacts, Businesses, Policies, Campaigns, Tasks, Quotes), actions, name, enable. Leads keeps **Run Macro** and **Run Follow-up Macro**. Tasks has **Run Macro** on the list and the record. `/settings/developer-hub/*` stays as live aliases. Import / Export (`/settings/import-export`) lists contacts, businesses, policies, carriers, leads, deals, plus activities, document metadata, commissions, and quote-sheet stubs. CSV import is a placeholder (`/settings/import`) until that slice merges. Deep links (`/settings/phone`, `/settings?section=phone`) still work.

Calendar chrome is three rows: **Add event | Add company meeting | Add training**, then **Month | Week | Day**, then **Task | Meeting | Call | Email | SMS**. Company meeting and training stay Admin. Month/week/day, drag-drop, type filters, and add-by-type stay as they were.

Nav cleanup: left-nav group is **Accounts** (Contacts + Businesses — not “People”). Sidebar Search is gone; Smart Search stays in the top bar. **Phone** (`/phone`) is a call log. Get Started, Inbox, and Support are off the rail — `/get-started` redirects Home; header Mail opens Settings → Email.

**Ana Dib HO3** stays shopping / unbound / Cov A **$321,000**. Source is **Book of business**. Do not bind.

## Lead / Deal / Contact source

One catalog in `src/lib/crm/sources.ts` — Referral, Google, Facebook, Instagram, Website, Call-in, Walk-in, Partner, AOR, Cross-sell, Renewal, Direct mail, Radio / TV, Event, Other, plus desk-intake values already on seeded rows. Lead, Deal, and Contact picklists all read that list. Convert and bind copy the same value. Do not fork a second source list.

## AMS wave 2 (kept)

In-house servicing on Policies that already exist. No IVANS, no rater, no Stripe / Twilio / DocuSign.

- **Policy 360** — servicing checklist (dec, ID cards, AOR, renewal date, next task) plus an endorsement / cancel / non-renew **request → start → file** pipeline. Filing updates the Policy and writes the activity log.
- **Book health** (`/book-health`) — active vs lapsed counts and missing servicing docs.
- **Renewals** (`/renewals`) — upcoming expirations, current vs proposed premium, in-app Task + Alert follow-up.
- **Certificates** (`/certificates`) — COI request queue. Issue still prints a desk stub. **Not a licensed ACORD product.**
- **IVANS / AL3** (`/settings/carrier-download`) — empty importer. Status stays **Not connected**. Attempt import returns `needs carrier download / IVANS later`. No fake carrier fees.

## AMS wave 3 (kept)

Servicing depth on the same Policies. Incoming `0049_ams_wave3` remapped to `0051_ams_wave3`.

- **Servicing checklist** — renewal docs, inspection, mortgagee, ID cards. Complete / incomplete toggles write in-desk Tasks.
- **Endorsement / cancel / non-renew** — durable `policy_service_request_events` log. Hale stays Active; Harbor’s cancel seed is **withdrawn**.
- **Book health** — lapse risk, monoline gaps, missing dec, plus wave 4/5 packet rollups.

## AMS wave 4 (kept)

Function-first depth on the same Policies. No redesign. Build stops at the API wall.

- **Service request queue** — clearer statuses + next-step copy, required fields (reason matches kind, summary, coverage A on coverage-change endorsements), activity log, in-app Task. File still updates the same Policy.
- **Mortgagee / additional interest** — personal-lines list CRUD on the Policy. Adding a name does not file an endorsement.
- **Packet checklist actions** — missing dec / ID / AOR can create an in-app Task. Elena AOR missing is the seed proof.
- **Book health** — agency book vs producer book rollups (by Policy owner).
- **Claims / FNOL** — intake + status pipeline + timeline. Carrier-site disclaimer. No carrier API.

Try: Elena `HO3-ELENA-2026` still has dec + ID, missing AOR (collect task open), mortgagee **First Community Bank ISAOA**, endorsement **in progress**. Hale `HP-FL-88421` endorsement stays **requested**. Do not file those to “prove” a cancel. Do not bind Ana.

## AMS wave 5 (kept)

Same Policies. No redesign. Stubs stop at the API wall.

- **Certificate holder / additional insured** — commercial Policy list plus COI picker. Issue still prints the desk stub; the stub now shows AI + special wording. Not ACORD.
- **Suspense / follow-ups** — missing AOR or ID cards auto-open an in-app Task when the Policy is opened. Hale empty packet is the seed proof. Dec stays a manual collect.
- **Producer vs CSR** — service requests carry a work desk. Elena is CSR; Hale is Producer. Filter on `/service-requests`.
- **Policy term history** — prior / current / proposed on the Policy. Elena has a prior 2025–26 term. Compare page unchanged.
- **Loss-run CSV stub** — desk claims summary download on the Policy. Elena wind inquiry is on the export. Not a carrier loss run.

## AMS wave 6 (kept)

Function first. Same Policies. No redesign. IVANS stays **Not connected**.

- **Certificate holder polish** — waiver of subrogation + primary & noncontributory on the COI request and issued stub. `/certificates/holders` lists holders already on commercial Policies.
- **Agency suspense board** (`/suspense`) — rollup of open AOR / ID-card auto-tasks. Mark collected from the board or the Policy. Dec stays a manual collect.
- **Cancel / non-renew notice diary** (`/notices`) — draft → mailed / withdrawn. **Does not file** and does not change Policy status. Hale has a drafted non-renew.

## AMS wave 7 (kept)

Function first. Same Policies. No redesign. IVANS stays **Not connected**. Wave 2–6 surfaces stay.

- **Claim diary** (`/claims/diary`) — follow-up / call / carrier-status / docs rows on the FNOL record. Completing a row does **not** file FNOL or change claim status. Elena wind inquiry has an open docs request.
- **Endorsement draft stubs** (`/endorsements`) — wording draft → ready / withdrawn. **Does not file** and does not change the Policy. Elena’s in-progress CSR endorsement has a drafted mortgagee stub.
- **Suspense aging** — days-open buckets on `/suspense` (current / watch / aging / stale) from the desk clock. Elena AOR is watch; Hale AOR is aging; Hale ID is stale.
- **Producer book filters** — click a producer on `/book-health?owner=` to filter missing packets. Agency totals stay.

Wave 6/7 SQL remapped to `0060_ams_wave6` and `0061_ams_wave7` on this tip. Wave 8 remapped to `0062_ams_wave8`. Wave 9 is `0063_ams_wave9`.

## AMS wave 8 (kept)

Function first. Same Policies. No redesign. IVANS stays **Not connected**. Wave 2–7 surfaces stay.

- **Service timeline** (`/service-timeline` + Policy 360) — activity log filtered to servicing events. A servicing note writes the log and does **not** file or bind. Elena has a CSR note.
- **Certificate holder contacts** (`/certificates/holders`) — add / edit / archive name, email, phone, address. Saving does **not** issue a COI. Palm Bay and Brevard are seeded; Brevard is linked to the open Harbor request.
- **Renewal pipeline queue** (`/renewals/queue`) — upcoming → quoting → offered → accepted / lost. **Does not bind** and does not change the Policy. Hale is quoting; Nair is upcoming. No rater.

Incoming `0053_ams_wave8` remapped to `0062_ams_wave8` on this tip.

## AMS wave 9 (kept)

Function first. Same Policies. No redesign. IVANS stays **Not connected**. Wave 2–8 surfaces stay.

- **Inspection diary** (`/inspections` + Policy 360) — 4-point / wind mit / roof / photo. requested → scheduled → completed / waived. Completing does **not** file. Elena roof is scheduled; Hale wind mit is requested.
- **Installment diary** (`/installments` + Policy 360) — agency bill / direct bill. scheduled → due → received / past due / waived. Marking received does **not** collect (no Stripe) and does not change Policy status. Elena October is scheduled; Hale August is past due.

## Localhost :43147 notes

After `npm run db:migrate && npm run db:seed` and `npm run dev`:

1. Sign in as **javy@fitfirst.local** / **javy**.
2. Open Elena Policy — AOR suspense still open, prior + current terms, loss-run CSV, CSR endorsement **in progress**, drafted mortgagee wording stub, service timeline note, scheduled roof inspection, October installment. Do not file. Do not bind Ana.
3. Open Hale Policy — ID + AOR suspense auto-opened, producer endorsement **requested**, drafted non-renew notice, renewal queue **quoting**, requested wind mit, past-due August installment. Do not file, mail, or cancel.
4. Harbor Policy / `/certificates` — Brevard AI on the open request; Palm Bay issued stub shows additional insured + wording + waiver + PNC. `/certificates/holders` lists both.
5. `/suspense` — Elena AOR (watch), Hale AOR (aging), Hale ID (stale). `/suspense?doc=aor` hides ID cards. `/suspense?age=stale` is Hale ID.
6. `/notices` — Hale drafted non-renew. Do not mark mailed to “prove” a cancel.
7. `/endorsements` — Elena drafted mortgagee stub. Do not mark ready to “prove” a file.
8. `/service-requests?desk=csr` — Elena. `?desk=producer` — Hale.
9. `/book-health` — agency + producer rollups; click a producer name to filter missing docs. Elena AOR and Hale packet still in missing docs.
10. `/claims` — FNOL pipeline. Elena wind inquiry diary is open. `/claims/diary` lists it. Camila water has a completed carrier-status row.
11. `/service-timeline` — Elena servicing note + Hale queue move + inspection / installment diary. `/renewals/queue` — Hale quoting, Nair upcoming. Do not mark accepted to “prove” a bind.
12. `/inspections` — Elena roof scheduled; Hale wind mit requested. Do not mark complete to “prove” a file.
13. `/installments` — Elena October scheduled; Hale August past due. Do not mark received to “prove” a payment.
14. Settings → IVANS / AL3 still **Not connected**.

## In-desk e-sign stub (kept)

Finish-line DocuSign stays parked. No paid e-sign vendor SDK.

1. Sign in as Javy or Maya.
2. Open **Elena Ruiz** — Deal Documents (`/deals` → Ruiz · Melbourne HO3 → Documents) or Policy `HO3-ELENA-2026`.
3. Under **In-desk signature**, pick an existing PDF or click **Create sample packet + request**.
4. Open **Open agent demo** (or the client sign link). Type a name and/or draw, then **Mark signed**.
5. Confirm **Signed** plus the timestamp on the record and on the Deals / Policies lists.

The banner always reads **In-desk stub — not DocuSign**. `/esign` lists in-desk envelopes first; vendor send stays `not_implemented`.

Do not bind Ana. Her shop stays Quote Sent at Coverage A **$321,000**.

## Deal Documents upload (this slice)

On Deal detail → **Documents**, source-doc upload is **half width** (`lg:grid-cols-2`). The right half is a live shop desk — not a banner:

- Related Contact / Lead / Business with **Send Email** and **Call** (same `RecordContextRail` person card)
- Quote Sheet status (confirmed / CHECK / missing) plus **Collect next** (dec / wind mit / 4-point still needed)
- Open activities, grouped like the rail

Extracted fields stay under the split. Page-right context rail is unchanged. No wipe.

```bash
git fetch && git checkout cursor/live-ff-tip-sep6f && git pull
npm install
npm run db:migrate
npm run dev -- --port 43147
```

1. Sign in as **javy@fitfirst.local** / **javy**.
2. Open a Deal → Documents. Upload sits on the left. Desk on the right has a person, email/call, sheet status, and open activities.
3. Ana Dib HO3 stays shopping / unbound / Cov A **$321,000**. Do not bind.

## Policy detail (this branch)

`/policies/[id]` shows a **Policy Information** card first: number, colored status, carrier, line/product/subtype, effective, expiration/renewal, premium, billing, Coverage A / limits, insured (Contact or Business link), premises, commission, selling agency, written date — whatever is already on `policies`. Servicing checklist, change history, and issued files stay below. The context rail repeats carrier + effective + premium.

### Local click-path (localhost:43147)

1. Sign in as **javy@fitfirst.local** / **javy**.
2. Policies → `HO3-ELENA-2026` — American Integrity, effective 2026-09-01, $2,840, Cov A $385,000, Elena Ruiz, 412 Harbor Isle Dr. Servicing + files still on the page.
3. Policies → `HP-FL-88421` (Hale) — Heritage, effective 2025-10-01, Cov A $275,000.
4. Policies → `GL-HARBOR-2026` — Harbor Key Marine LLC, effective 2026-08-15, 88 Harbor Key Blvd.
5. Ana Dib HO3 stays shopping / unbound / Cov A **$321,000**. Do not bind.

## Tests

```bash
npm test
```


## Developer Hub (admin)

Settings → **Automations & Developer** (one card). Working stubs stop at the OAuth wall. No live Zoho writes. Macros are listed once.

| Route | What it does |
| --- | --- |
| `/settings/developer` | Overview + status chips |
| `/automations` | Same tools as hub cards + Developer tools tabs |
| `/automations/functions` (also macros, webhooks, api-keys, connections) | Same records, Automations chrome |
| `/settings/developer/functions` | CRUD + Run test + execution log |
| `/settings/developer/api-keys` | Create / regenerate / revoke. Secret shown once. |
| `/settings/developer/webhooks` | Outbound queue + inbound Signals slugs |
| `/settings/developer/connections` | Named connectors. Authorize is a wall. |
| `POST /api/dev/functions/[apiName]/execute` | Org API key. Seeded `echo_payload`. |
| `POST /api/dev/webhooks/inbound/[slug]` | Stores payload + in-app Alert |

Seeded demo org key: `ffk_devhub_demo`.

```bash
curl -s -X POST http://127.0.0.1:43147/api/dev/functions/echo_payload/execute \
  -H "Authorization: Bearer ffk_devhub_demo" \
  -H "Content-Type: application/json" \
  -d '{"contact":"Elena Ruiz","line":"HO"}'
```

Tables (all `tenant_id`): `developer_functions`, `developer_function_executions`, `developer_org_api_keys`, `developer_webhooks`, `developer_webhook_deliveries`, `developer_inbound_hooks`, `developer_inbound_payloads`, `developer_connections`.

## Test notes (localhost:43147)

1. Sign in as Javy. Open **Deals**. Confirm Table is the default, then Board | Funnel.
2. Funnel: each stage has a color chip and a count. Click **Quote Sent** — table filters to that stage. Clear filter returns to All / that board.
3. Board columns and table Stage cells use the same chips. Stage chips under the create-deal form match.
4. **Policies**: Active / Bound / Pending / Lapse (and others) are colored badges on the list and the policy header.
5. **Contacts** / **Businesses**: Client vs Former Client badges on the list and the record header.
6. Confirm Ana is still unbound, Cov A $321,000. Do not bind her.

## CRM depth (this branch)

In-house CRM up to the API wall. No paid email/SMS/Zoho plugs. Chrome stays (sidebar `#1d4e89`).

- **Lead → Deal convert** copies name, mailing, notes, source, language, email, phone, DOB onto the deal, risk, and Quote Sheet blanks. Idempotent. Links a matching Contact when one already exists (does not create a Contact — bind still does that). Writes a convert task + alert.
- **Contact / Business 360** shows policies, deals, and activities at a glance. Contact opt-out flags are editable. Record comms queue email/SMS from the record.
- **Pipeline** stage moves update both `pipeline_stage` and `pipeline_stage_slug`. Meeting types (video / in-home / in-office) write a calendar activity plus an in-app task/alert.
- **Outbound queue** at `/settings/outbound` drafts or holds email/SMS intent. Nothing sends. Opt-outs hold the job.

## Quote Sheet (this branch)

Deal tabs are **Documents · Quote Sheet · Markets · Quotes**. Master Risk is not on the Deal.

On **Quote Sheet**:
- Line tabs (Home, plus any other shop lines). Add line opens a blank worksheet.
- **Edit** / **Enter data** unlocks every field. **Save Quote Sheet** / **Cancel** are next to the fields.
- Manual entry works with no PDF. Fill from source docs is optional.
- Toolbar: **Fill from source docs** (needs an uploaded dec), **Copy sheet** (clipboard packet for carrier paste), **Send field sheet** (Fill clipboard + browser handoff — not email).

### How to test at localhost:43147

1. Log in as **javy@fitfirst.local** / **javy**.
2. Open Ana: [http://localhost:43147/deals/22222222-2222-4222-8222-222222222222?tab=quote-sheet&line=home](http://localhost:43147/deals/22222222-2222-4222-8222-222222222222?tab=quote-sheet&line=home). Confirm Cov A is $321,000, shopping / unbound. Do not bind.
3. Click **Edit**. Change a yellow or notes field (leave Cov A alone if you want the Javy-tested tag). **Save Quote Sheet**. Confirm the value stuck. **Cancel** discards an in-progress edit.
4. Confirm there is no **Master Risk** tab. **Markets** and **Quotes** still open. Documents + Quick communications stay on the Deal.
5. On another Deal (or Add line → Auto), open a blank line with no source docs and use **Enter data** to type the sheet without a PDF.

## Commissions (`/commissions`)

Cleanup for Javy: no Ask-a-teammate chrome. Agent sees **My commissions**, **Pending**, and **Paid**. Filter insurance type **Life / Health / P&C**, then a subtype (Home / Auto / Flood / Commercial, or Life and Health subs). Admin still gets a simple agency-by-producer rollup. Ana Dib stays shopping / unbound / Cov A **$321,000** — $0 here, no bind.
