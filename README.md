# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

## Tip branch

**`cursor/live-crm-zoho-tip-sep5c`** — live CRM+Quote tip for the Air / mini desk. Starts from **`cursor/live-ff-zoho-data-1809`** (CRM+Quote + Zoho wipe/import), then merges:

1. **`cursor/ff-zoho-owner-fix-6b9e`** — Zoho import always writes `owner_id` (map Zoho Owner, else Javy). `npm run db:assign-owner` fills leftover nulls so Maya’s lists are not empty.
2. **`cursor/ff-sidebar-accordion-31b5`** (agent `bc-38f9fe06`) — Zoho-like one-open left-nav accordion. Last-open + icon rail in `localStorage` (`ff-sidebar-accordion:v1`). Active route’s section auto-expands.

AMS waves 10–16 stay parked (`cursor/ams-wave16-depth-e1a7` is not on this tip). Sidebar stays `#1d4e89` with off-white active rows. Notification bell stays in top chrome. Live Zoho is book of record — no live Zoho writes. Quotes never create a Policy. After wipe+import, Ana is usually gone; if demo Ana remains, Cov A stays **$321,000** unbound.

### Live typeahead search (this slice)

Top chrome search fills as you type (200ms debounce). No Search click. Contains-match across **contacts, leads, deals, businesses, policies, and carriers**. Arrow keys + Enter open a hit; “See all results” still goes to `/search`.

The same live-contains box sits on module lists (Leads, Contacts, Businesses, Policies, Carriers, Deals, Quotes, Tasks, Claims, Work queue). Typing filters the list immediately. Named dropdown filters are unchanged.

## Run locally (Mac Air and Mac mini)

```bash
cd ~/FitFirst
git fetch && git checkout cursor/live-crm-zoho-tip-sep5c && git pull
npm install
npm run db:migrate
# if owners still null after prior import:
npm run db:assign-owner
npm run db:seed   # only if he wants demo seed; skip if keeping live Zoho-imported book
npm run dev -- --port 43147
```

Then Chrome [http://localhost:43147](http://localhost:43147). Login **javy@fitfirst.local** / **javy**. Function first; no redesign. Do **not** run `db:wipe-crm` just to pick up the sidebar or owner-fix slices.

### Left nav accordion (this slice)

Grouped rail: **Work**, **Accounts**, **Records**, **Desk**, **Settings**. Home stays pinned above the accordion.

1. Click a section header — that group expands and every other group collapses (one at a time).
2. Click the open header again to close it. All closed is OK.
3. Last-open section is remembered in `localStorage` (`ff-sidebar-accordion:v1`). Home restores that memory; a record route always opens its own section so the current page stays visible.
4. **Collapse sidebar** at the bottom of the rail switches to an icon-only narrow rail. Same accordion. Preference is stored next to last-open.
5. Color stays `#1d4e89`. AMS items already under Records are unchanged — this slice is nav chrome only.

### Air checkout (no wipe)

```bash
git fetch && git checkout cursor/live-crm-zoho-tip-sep5c && git pull
npm install
npm run db:migrate
# if owners still null after prior import:
npm run db:assign-owner
npm run dev -- --port 43147
```

Do not run `db:wipe-crm` or `db:seed` if the live Zoho book is already loaded. If Maya’s lists are empty from an older import, `npm run db:assign-owner` only.

### Home custom layouts + corner resize (this slice)

1. Home (signed in as **javy@fitfirst.local** / **javy**).
2. **Layout** (same outline dropdown as Book) → pick a preset, or **Save as custom layout…**, name it, then pick it later. **Rename current layout…** while a custom layout is active.
3. **Widget settings** → check **Resize tiles** → pull the bottom-right corner of any card. Neighbors keep their size. Preset chips still work.
4. Management lead offers still show language / state (Montana licensed producers). After wipe+import the book is Zoho data, not the Ana demo.

First-time only: `cp .env.example .env`. Postgres on `DATABASE_URL` (default `postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst`). `docker compose up -d db` if you need the local database.

Demo login (MFA bypass): **javy@fitfirst.local** / **javy** (Admin) or **maya@fitfirst.local** / **maya** (Agent). Switch users from the left-nav footer or `/login`.

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

Nav cleanup: left-nav group is **Accounts** (Contacts + Businesses — not “People”). Sidebar Search is gone; Smart Search stays in the top bar. **Phone** (`/phone`) is a BYO-later setup stub with a dialer that logs outcomes on activities. **Inbox** (`/inbox`, eyebrow Envoys) is a work-email-later stub that shows seeded inbound queue rows.

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

1. Sign in as Javy. Open **Pipeline**. Confirm Board | Table | Funnel.
2. Funnel: each stage has a color chip and a count. Click **Quote Sent** — table filters to that stage. Clear with **Show all stages**.
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
