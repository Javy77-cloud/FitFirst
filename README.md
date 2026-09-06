# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

## Mac test now (`cursor/live-ff-tip-sep6q`)

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

Default rail, top → bottom: **Home**, **Leads** (no kids), **Deals** (Quotes only), **Contacts** (no kids), **Policies** (My Book / Renewals / Certificates — parent click lands on My Book), **Business** (collapsed), **Carriers** (collapsed), divider, then **Tasks** (no kids), **Calendar** (no kids), **Templates** (email signatures / email templates / document templates), **Reports** (no kids), **Settings** (agency, admin only, empty kids), **Admin** (admin only: People, Integrations, Automations, Triggers, Commission rates, Lines of business, Offices, Agency chrome, then **Operations** last). Operations children (admin only): Billing, Claims, Endorsements, Compliance, Carrier Downloads, Book of Health, Book of Life, Marketplace. Operations is **not** a top-level rail row. Agents never see Settings, Admin, Operations, or anything inside Operations. `NAV_LAYOUT_VERSION` is **6**; older per-user `nav_layout` blobs reset to this rail (personal timezone / signature prefs are kept).

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
