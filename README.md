# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

## Run locally

```bash
cp .env.example .env
# Postgres on DATABASE_URL (default postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst)
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

Demo login (MFA bypass): **javy@fitfirst.local** / **javy** (Admin) or **maya@fitfirst.local** / **maya** (Agent). Switch users from the left-nav footer or `/login`.

## Pipeline views + status colors (this slice)

Overnight feel-pass: grouped left nav, named list filters, header column sliders, RecordContextRail, Start Shop, in-desk calendar, quick comms, Choose files, floating Support, settings accordion, widget resize chrome, Ask a teammate, HTML 404s.

Typography: full desk scale-up on a **16px** root. Tailwind `text-sm`/`base`/`lg`/`xl` sit one step larger (15 / 17 / 20 / 22px). Helper **15px**, caption **14px**, `--ff-muted` **#3f4e5c**. Buttons/inputs default **h-9**. Nav items **15px** on a `w-60` rail. Tables **16px**. Leftover 10–13px classes remap through the shared tokens.

Home tiles: drag the grip to reorder, size menu **1×1 / 1×2 / 2×1 / 2×2**, stored in `localStorage` as `ff-home-layout:v1:<book>`. **Reset tile layout** is on the Home header. Line-of-business donut stays 68px.

Today’s batch4 surface: darker blue sidebar (`#1d4e89` / `--ff-sidebar-blue`), admin/agent actor switcher, rich home widgets (contest, lead offers, hit/lost, KPIs, birthdays, renewal risk, mix donut, book scope), Documents / ACORD library, offices + territories, Social/GBP stubs, carrier portal login admin, login/session/MFA.

**Automations** is in-desk only. Playbooks fire Tasks and in-app Alerts (renewal 60/30, Closed Won, Quote Sent, birthday). Template library is EN/ES preview — nothing sends. No Twilio / SendGrid / paid campaign vendors. Admin writes playbooks; agents see their book. Internal pings stay in Alerts / pop-up.

**Import / Export** (Admin only): [http://localhost:43147/settings/import-export](http://localhost:43147/settings/import-export) — CSV export, templates, and dry-run import for Leads, Contacts, Businesses, Deals, Policies, Carriers, plus export (or stub import) for activities, notes, documents, commissions, quotes, users, pipelines, and appetite/decline logs. No paid migration vendor. IVANS/AL3 stays a Not-connected stub.

AMS desk: file endorsement / cancel / non-renew on the Policy with a clear outcome. Renewal compare shows dollar and percent premium change. Work queue lists flags, notes, assignee, and in-app pings (addressed to the assignee). Claims log is a three-column FNOL board. Commissions split pending (still owed) vs paid. Missing-data gauges link to the Quote Sheet cell.

**Integrations** (`/settings/integrations`): same chrome as the catalog. Demo Connect / Disconnect for Google, Outlook, Zoho Mail/Calendar, Facebook / Instagram / GBP, SMS, e-sign, and EZLynx / QuoteRush. Status is **Connected (demo)** or **Not connected**. Copy is **Agency pays the vendor.** No OAuth, API keys, Stripe, or Twilio. GBP gate stays on Settings → Social. Linked from Settings.

Settings is Setup-style **card groups** (Agency & People, Desk & Phone, Integrations / Connect, Automations & Developer, Security, Import / Export, Billing stub) — not one endless left rail. Phone and agency stay under the Admin Settings group. Developer Hub is a placeholder card into `/automations` until that slice lands. Import / Export (`/settings/import-export`) lists contacts, businesses, policies, carriers, leads, deals, plus activities, document metadata, commissions, and quote-sheet stubs. CSV import is a placeholder (`/settings/import`) until that slice merges. Deep links (`/settings/phone`, `/settings?section=phone`) still work.

Calendar chrome is three rows: **Add event | Add company meeting | Add training**, then **Month | Week | Day**, then **Task | Meeting | Call | Email | SMS**. Company meeting and training stay Admin. Month/week/day, drag-drop, type filters, and add-by-type stay as they were.

**Ana Dib HO3** stays shopping / unbound / Cov A **$321,000**. Do not bind.

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

## Localhost :43147 notes

After `npm run db:migrate && npm run db:seed` and `npm run dev`:

1. Sign in as **javy@fitfirst.local** / **javy**.
2. Open Elena Policy — AOR suspense still open, prior + current terms, loss-run CSV, CSR endorsement **in progress**. Do not file. Do not bind Ana.
3. Open Hale Policy — ID + AOR suspense auto-opened, producer endorsement **requested**. Do not file or cancel.
4. Harbor Policy / `/certificates` — Brevard AI on the open request; Palm Bay issued stub shows additional insured + wording.
5. `/service-requests?desk=csr` — Elena. `?desk=producer` — Hale.
6. `/book-health` — agency + producer rollups; Elena AOR and Hale packet still in missing docs.
7. `/claims` — FNOL pipeline and “Handle the claim on the carrier website.”
8. Settings → IVANS / AL3 still **Not connected**.

## In-desk e-sign stub (kept)

Finish-line DocuSign stays parked. No paid e-sign vendor SDK.

1. Sign in as Javy or Maya.
2. Open **Elena Ruiz** — Deal Documents (`/deals` → Ruiz · Melbourne HO3 → Documents) or Policy `HO3-ELENA-2026`.
3. Under **In-desk signature**, pick an existing PDF or click **Create sample packet + request**.
4. Open **Open agent demo** (or the client sign link). Type a name and/or draw, then **Mark signed**.
5. Confirm **Signed** plus the timestamp on the record and on the Deals / Policies lists.

The banner always reads **In-desk stub — not DocuSign**. `/esign` lists in-desk envelopes first; vendor send stays `not_implemented`.

Do not bind Ana. Her shop stays Quote Sent at Coverage A **$321,000**.

## Tests

```bash
npm test
```


## Developer Hub (admin)

Settings → Developer Hub. Working stubs stop at the OAuth wall. No live Zoho writes.

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
