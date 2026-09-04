# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

**Mac desk-test branch:** `cursor/mac-ready-overnight-3bad`

Overnight merge of Home donut, Pipeline overhaul, Leads cleanup, Columns + address autofill, and later record / AMS slices. Ana Dib stays Quote Sent / unbound, Cov A **$321,000**. Do not bind her. Do not edit the Ana fixture.

## Run locally (Mac)

```bash
git fetch origin cursor/mac-ready-overnight-3bad
git checkout cursor/mac-ready-overnight-3bad
git reset --hard FETCH_HEAD
cp .env.example .env
# Postgres on DATABASE_URL (default postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst)
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

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

Open [http://localhost:43147](http://localhost:43147). Home is the owner desk (paper + terracotta). Demo login: `javy@fitfirst.local` / `javy` (Admin, all book) or `maya@fitfirst.local` / `maya` (Agent, own book).

Leads are the person record (name, DOB, contact, address, insurance wanted). Dec / 4-point / wind mit drop lives on **Deals**. Click path and leftover bugs live in `COORDINATION.md`.

**Contact record** is Zoho-style: a left jump menu lists Overview, Contact information, Address, Policies, Deals, Businesses, Locations, Ask a teammate (Admin only), Email/SMS/calls, and Timeline. Click jumps to that section. There is no typed activity log — work done from the desk (email, SMS, task, meeting, click-to-call) saves onto that contact’s Timeline. Ana stays **Not a client** with **0 policies**. No live Zoho.

**Business record** mirrors that jump layout: Overview, Business information, Address, Policies, Deals, People, Locations, Certificates, Ask a teammate (Admin only), Email/SMS/calls, and Timeline. Harbor Key Marine LLC stays **Client** with **GL-HARBOR-2026**.

Settings → Lines: hide Life or Health for agencies that do not write those books (pipeline switcher and filters follow). One Pipeline nav row — Life and Health stay as tabs on `/pipeline`. Life chips default to Term / Whole / IUL / Final Expense. Health chips default to Marketplace / Medicare Advantage / Medicare A&B / Supplemental. Selling Agency picklists stay off unless you turn them on in Settings.

Admins can tag a teammate on a Policy or any other record (**Ask a teammate**). On the Contact record the tag form is **hidden for agents**. That writes the same `record_asks` row used on commissions, logs it on the record, and pings Alerts. Not a chat product. No email or SMS to the tagged person. Seeded: Javy asked Maya for status on `HO3-ELENA-2026`.

## Pipeline

- Personal-lines tab is **P&C pipeline** (slug stays `p-c`).
- **Won-Lost** and **Archive** are two tabs, not one combined “Won-Lost / ARCHIVE”.
- **Flood** is a normal board — no Admin badge, no Admin stage panel.
- Columns sit side-by-side and collapse from the header chevron.
- **Edit stages** on any board: add, rename, remove, reorder.
- Drag a deal card onto another column to move it.
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

## Communication (this desk)

- **Ask a teammate** on Policy / Contact / Lead / Deal / Business / Carrier. Tag dropdown is required. On Contact and Business the whole Ask block is Admin-only (hidden for agents). Seeded Javy → Maya on `HO3-ELENA-2026`. Writes a durable activity log + Alerts ping.
- **Contact / Business Timeline** auto-saves email, SMS, tasks, meetings, and calls done from the desk. No manual “log activity” form on those records.
- **Click-to-call** writes an in-app Alerts ping and a call row on the record (`/phone` is a stub). No email.
- **Email templates + triggers** live under Settings as stubs. Nothing sends.
- **Alerts** stay in-desk (asks + work-queue pings).

## Tests

```bash
npm test
```

## Out of scope

Multi-tenant isolation, credential vaults, billing, live Zoho writes, rater APIs, fake AI scores, emails, building a second CRM.
