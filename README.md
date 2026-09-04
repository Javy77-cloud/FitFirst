# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

**Mac desk-test branch:** `cursor/mac-ready-batch3-7pm` (batch-3 consolidate on `cursor/mac-ready-overnight-3bad`)

Login is required. `src/proxy.ts` plus session guards enforce Admin vs Agent — not CSS.

Contact record: Ask a teammate is Admin-only on every record. Email / Call / SMS stay. No typed email/SMS log — timeline fills when the desk sends or receives. SMS and email opt-out tracking on the contact. Left menu highlights the active module (`/contacts/*` → Contacts). Leads list/detail show the related deal’s pipeline stage. Column pickers include that module’s create/edit form fields.

Deals list has one upload: pick an existing Deal by person or business name, then add typed file lines (4-point, wind mit, current policy, quotes, permits, hand notes, dec pages, signed app). Inside the Deal: Source documents, Issued quote PDFs, and Signed app. Ask a teammate and email/SMS logs are off Quote Sheet, Markets, and Quotes. Master risk is Admin-only at Settings. E-sign stubs are DocuSign / Dropbox Sign BYO.

Policies are Life / Health / P&C with family fields, Zoho-style auto name, status colors (Active green · Lapse/Bound yellow · else red), term by family, multi-file attach, and a commission block. Cov A stays on quoting only. Policy records show auto activity — no Ask a teammate, no typed SMS/call/email log. Settings → Global lists holds policy types, sub-types, terms, statuses, and file categories (carriers stay linked). Home Needs attention filters Overdue / This week / This month / Next month. Calendar buttons are Previous month / Next month; you can delete an event and + Add any type. Quote sections say Expand / Collapse.

Ana Dib stays Quote Sent / unbound, Cov A **$321,000**. Do not bind her. Do not edit the Ana fixture. No live Zoho.

## Run locally (Mac)

Stop the current `next dev` on **43147**, then:

```bash
git fetch origin cursor/mac-ready-batch3-7pm
git checkout -B cursor/mac-ready-batch3-7pm origin/cursor/mac-ready-batch3-7pm
cp .env.example .env
# Keep PII_ENCRYPTION_KEY from .env.example (64 hex chars). Local Mac demo key.
# Postgres on DATABASE_URL (default postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst)
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

Hard-refresh Chrome. Open a Contact (no Ask panel; opt-outs + Email/Call/SMS). Open Leads and confirm deal stage. Column picker on Leads includes every New Lead field.

If `db:migrate` / `db:seed` fail after a consolidate pull (missing `deals.account_kind` or similar), reset the local database and run migrate + seed again. Do not edit the Ana Dib fixture.

**Docker Postgres (this repo):**

```bash
docker compose down -v
docker compose up -d db
# wait until healthy, then:
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

**Local Homebrew / Postgres.app:**

```bash
dropdb -h 127.0.0.1 -U fitfirst fitfirst || true
createdb -h 127.0.0.1 -U fitfirst fitfirst
# or, as the postgres superuser:
# psql -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS fitfirst;"
# psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE fitfirst OWNER fitfirst;"
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

**PII at rest:** SSN, EIN/FEIN, and driver license numbers are AES-256-GCM encrypted with `PII_ENCRYPTION_KEY` before write. Postgres stores ciphertext + IV + last4 only. Lists show `***-**-1234` (or EIN/DL mask). Reveal is Admin or owning Agent and writes `pii_reveal_logs` (no decrypted value). Ana has no SSN. Elena demo SSN is fake encrypted `000-00-4444`. Harbor / Ruiz Tile EINs and Soto DL are sealed at seed.

Open [http://localhost:43147](http://localhost:43147). `/login` has two cards:

- **Admin** — Javy Rivera (`javy@fitfirst.local` / `javy`). Whole book. Settings, integration connect, global lists, Ask a teammate, appetite/carrier edit.
- **Agent** — Maya Chen (`maya@fitfirst.local` / `maya`). Own book CRM, pipeline deals, calendar items, and client email/SMS when the agency line is connected. Cannot open Admin Settings, Ask a teammate, agency connect, or global list edits.

Leads are the person record (name, DOB, contact, address, insurance wanted). Document upload lives on **Deals** and requires an existing Deal name before files store. Click path and leftover bugs live in `COORDINATION.md`.

**Settings → E-sign** is Admin BYO for DocuSign or Dropbox Sign (stub only). **Settings → Master risk** is the Admin appetite worksheet — not a Deal tab.

Communications (email, SMS, calls, meetings, tasks) write a durable log on the Contact, Deal, Policy, Lead, or Business record — inbound and outbound email stay as one conversation. No live Twilio or SendGrid.

**Calendar** is a real month / week / day board with hourly slots, type colors, filters, in-place edit, drag-drop reschedule, delete, and **+ Add event** for any type. Previous month / Next month (and week/day) are labeled. Google Calendar stays a stub.

**Phone** is a call log (duration + outcome, attached to Contact / Policy / Deal / Lead / Business). Admin Settings can mark a Twilio / Vonage / BYO trunk as connected — stub only; the agency pays later. Nothing dials.

**Contact record** is Zoho-style: a left jump menu lists Overview, Contact information, Address, Policies, Deals, Businesses, Locations, Ask a teammate (Admin only), Email/SMS/calls, and Timeline. Click jumps to that section. There is no typed activity log — work done from the desk (email, SMS, task, meeting, click-to-call) saves onto that contact’s Timeline. Ana stays **Not a client** with **0 policies**. No live Zoho.

**Business record** mirrors that jump layout: Overview, Business information, Address, Policies, Deals, People, Locations, Certificates, Ask a teammate (Admin only), Email/SMS/calls, and Timeline. Harbor Key Marine LLC stays **Client** with **GL-HARBOR-2026**.

List sheets share one header control: click a column to sort A→Z / Z→A, or open the header menu to pin it. The Columns picker stays on the title row.

Quote tracking / Quote Sheet / deal Quotes sections fold when they do not need attention. Claims log has a prominent **Add new claim**. Commissions filters by Life / Health / P&C plus line subfilters and last/next windows. Ana stays shopping / $0 commission / unbound.

Settings has a nested left menu: Communications (email, SMS, phone, video), **Integrations** catalog, Lines / Global lists, Brand / Agency, and Admin vs Agent prefs. The catalog lists Gmail, Outlook, Yahoo, Mailchimp, Constant Contact, SendGrid, Google/Outlook Calendar, Twilio, RingCentral, Lightspeed Voice, Zoom, Google Meet, DocuSign, and Dropbox Sign. Each card is bring-your-own (agency pays) with a **Connect stub** and **Not connected** / **Connected (stub)** badges. No live OAuth. No Zoho.

Settings → Lines: hide Life or Health for agencies that do not write those books (pipeline switcher and filters follow). One Pipeline nav row — Life and Health stay as tabs on `/pipeline`. Life chips default to Term / Whole / IUL / Final Expense. Health chips default to Marketplace / Medicare Advantage / Medicare A&B / Supplemental. Selling Agency picklists stay off unless you turn them on in Settings.

Admins can tag a teammate on a Policy or any other record (**Ask a teammate**). The block is **Admin-only on every record** — hidden for agents on Contact, Deal (including Quote Sheet / Markets / Quotes tabs), Policy, Lead, Business, and Carrier. That writes the same `record_asks` row used on commissions, logs it on the record, and pings Alerts. Not a chat product. No email or SMS to the tagged person. Seeded: Javy asked Maya for status on `HO3-ELENA-2026`.

## Pipeline

- Personal-lines tab is **P&C pipeline** (slug stays `p-c`).
- **Won-Lost** and **Archive** are two tabs, not one combined “Won-Lost / ARCHIVE”.
- **Flood** is a normal board — no Admin badge, no Admin stage panel.
- Columns sit side-by-side. Each stage header has a small up/down arrow on the right to collapse or expand that column.
- **Edit stages** on any board: add, rename, remove, reorder.
- Drag a deal card onto another column to move it.
- Cards show **Call**, **SMS**, **Task**, and **Meeting**. Dial and Mail are gone. Meeting types: Video-call, In-Home, In-Office.
- In-Office uses the agency office plus the agent’s meeting address from Settings → Communications. In-Home pulls the Deal / Lead street. Video opens the Zoom / Meet / BYO stub saved there.
- **Ask a teammate** does not appear on pipeline cards (Admin-only on records).
- **Columns** picker chooses which deal details show on cards and the table. Title stays on.

## Columns picker

On every datasheet (Leads, Deals, Contacts, Businesses, Policies, Carriers, Tasks, Reviews), the **Columns** control sits on the far right of the AppShell title row — same bar as the page title and Smart Search. It does not float over the table body.

## Address autofill

Street / mailing / premises / location fields use `AddressAutofill`. With `GOOGLE_MAPS_API_KEY` or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`, typing a street offers Google Places suggestions and fills city, state, ZIP, and county on the same form. Without a key the desk still loads; those fields are ordinary text inputs.

## Seeded click-through

- **Elena Ruiz · Melbourne HO3** — Lead (person only) → Deal (source docs + shop) → Quote Sheet → Contact + Policy `HO3-ELENA-2026`. Linked business **Ruiz Tile LLC** has no commercial policy. Dec / 4-point / wind mit drop lives on **Deals**, not Leads.
- **Harbor Key Marine LLC** — commercial Closed Won. EIN 59-1234567, GL policy `GL-HARBOR-2026` on the Business. COI stub on the Business. Not Keystone Holdings (`TR-GL-22019`).
- **Ana Dib HO3** — `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Stage **Quote Sent**, unbound, Cov A **$321,000**. Do not bind. Do not edit that fixture.
- **Ortega · Winter Garden HO3** — inland masonry shop for Markets auto-fits.
- **Rosa Keene** — open merge pair on email (do not merge Ana).
- Wave-1 book names when seeded: Mario Cromartie, Virginia Palacios, Fritzs Seraphin, VP Painting & Construction.

Super-Copy, Send to Fill, and Forms Fill read the same `quote_sheets` row. Communications write a durable log on the record. No Twilio, SendGrid, or live Zoho.

## BATCH3 quoting (ASAP test)

1. **Lead → Deal.** Open a Lead. Convert when ready. Source docs stay off the Lead.
2. **Deal drop.** On the Deal, upload a dec / 4-point / wind mit (or sample clean dec). Pick **HO3 homeowners**. That fills the HO3 master sheet and prepares empty Auto + GL + WC worksheets.
3. **Visual approve.** Quote Sheet tab: glance yellow/blue cells. Check **I visually reviewed this master sheet**, click **Approve and unlock quoting**, then confirm **Are you sure?**
4. **Handoff.** After unlock: **Copy sheet**, **Send to Fill**, or **Open Fill window**. Prefer the Chrome Fill add-on (`extensions/fill`). No per-agent bot. If the add-on is missing, copy/paste in the new window.
5. **Appetite log.** Quotes tab → quoted / declined / maybe. `maybe` does not change filter-first matching.
6. **Ana lock.** `Dib · Palm Bay HO3` Cov A **$321,000**. Stay shopping. Do not bind.
7. **Admin-only.** Master risk + Markets/appetite stay Admin. Ask a teammate on Deal is hidden for agents.
8. **Communications / Integrations.** Settings → Communications: email (Gmail/Workspace, Outlook/365, Yahoo), campaigns (Mailchimp, Constant Contact, SendGrid), calendar, phone/SMS (Twilio, RingCentral, Lightspeed Voice, Bandwidth optional), Zoom/Meet, DocuSign + Dropbox Sign. Plug-only. Agency pays. FitFirst does not subscribe to Twilio.

## Communication (this desk)

- **Ask a teammate** on Policy / Contact / Lead / Deal / Business / Carrier. Tag dropdown is required. The whole Ask block is Admin-only (hidden for agents) on every record. It never appears on pipeline cards. Seeded Javy → Maya on `HO3-ELENA-2026`. Writes a durable activity log + Alerts ping.
- **Contact / Business Timeline** auto-saves email, SMS, tasks, meetings, and calls done from the desk. No manual “log activity” form on those records.
- **Phone call log** (`/phone`) — duration + outcome, attached like platform auto-activity. Admin **Phone line** settings are a Twilio/BYO stub. No PSTN.
- **Calendar** — month / week / day, hourly slots, type colors, filter, edit, drag-drop reschedule.
- **Email templates + triggers** live under Settings as stubs. Nothing sends.
- **Integrations catalog** (`/settings/integrations`) — BYO providers (Gmail, Outlook, Yahoo, Mailchimp, Constant Contact, SendGrid, Google/Outlook Calendar, Twilio, RingCentral, Lightspeed Voice, Zoom, Meet, DocuSign, Dropbox Sign). Connect stub only. Agency pays. No Zoho. No live OAuth.
- **Alerts** stay in-desk (asks + work-queue pings).
- **Meetings** from a pipeline card: Video-call, In-Home, or In-Office. Settings → Communications stores Zoom / Meet / BYO stubs plus the agency office and each agent’s meeting address.

## Tests

```bash
npm test
```

## Known leftovers

- `/documents` still 500 (`Object.entries` on null). Not a NAV item.
- `tsc` still drifts (asks.updatedAt, contact tags, quote-sheet `photo-ocr` source, email template field names). `npm run build` is green because Next skips that leftover (`typescript.ignoreBuildErrors`). Desk routes compile under Turbopack.
- `/phone` is a call log + trunk stub. No PSTN. Google Calendar stays a stub.
- Address autofill needs `GOOGLE_MAPS_API_KEY`; without it the fields are ordinary inputs.
- Search is substring, so `Ana` also lists Camila.
- Camila Auto `QBE-PA-66103` still has an empty vehicle schedule (Soto `FF-PA-4401` is the 2/2 seed).
- Policy compare stays the thin reader (ComparePanel not reattached).

## Out of scope

Multi-tenant isolation, credential vaults, billing, live Zoho writes, rater APIs, fake AI scores, emails, building a second CRM.
