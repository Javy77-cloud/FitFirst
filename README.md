# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

**Mac desk-test branch:** `cursor/pipeline-overhaul-d52a`

Pipeline overhaul on this branch:

- Personal-lines tab is **P&C pipeline** (slug stays `p-c`).
- **Won-Lost** and **Archive** are two tabs, not one combined “Won-Lost / ARCHIVE”.
- **Flood** is a normal board — no Admin badge, no Admin stage panel.
- Columns sit side-by-side and collapse from the header chevron.
- **Edit stages** on any board: add, rename, remove, reorder.
- Drag a deal card onto another column to move it.
- **Columns** picker chooses which deal details show on cards and the table. Title stays on.

Ana Dib stays Quote Sent / unbound, Cov A **$321,000**. Do not bind her. Do not edit the Ana fixture.

## Run locally (Mac)

```bash
git fetch origin cursor/pipeline-overhaul-d52a
git checkout cursor/pipeline-overhaul-d52a
git pull origin cursor/pipeline-overhaul-d52a
cp .env.example .env
# Postgres on DATABASE_URL (default postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst)
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 43147
```

If this desk already had the old combined Won-Lost/ARCHIVE tab, migrate + seed (or just open `/pipeline` — `ensureSeededPipelines` splits Archive onto its own board and renames P-C). If `db:migrate` / `db:seed` fail after a consolidate pull (missing `deals.account_kind` or similar), reset the local database and run migrate + seed again. Do not edit the Ana Dib fixture.

**Click the new pipeline:**

1. Sidebar **Pipeline** → **P&C pipeline**. Ana is on Quote Sent, unbound, Cov A $321,000.
2. Elena Ruiz and Harbor Key Marine sit on Closed Won. Drag one to Review, then back.
3. Collapse **Meet / Quotes**. Expand it again.
4. **Edit stages** → add a column, rename it, move it with ← →, then remove it.
5. **Deal details** → hide Email, show Current carrier. Same picker applies to **Table**. **Board** / **Table** switches the view.
6. Open **Won-Lost** (Closed Won / Closed Lost only). Open **Archive** (separate tab).
7. Open **Flood**. Confirm there is no Admin label. Stages edit the same way as P&C.

**Docker Postgres (this repo):**

```bash
docker compose down -v
docker compose up -d db
# wait until healthy, then:
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
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
npm run dev
```

Open [http://localhost:43147](http://localhost:43147). Home is the owner desk (paper + terracotta). Demo login: `javy@fitfirst.local` / `javy` (Admin, all book) or `maya@fitfirst.local` / `maya` (Agent, own book).

Communications (email, SMS, calls, meetings, tasks) write a durable log on the Contact, Deal, Policy, Lead, or Business record — inbound and outbound email stay as one conversation. No Twilio or SendGrid.

Admins can tag a teammate on a Policy or any other record (**Ask a teammate**). That writes the same `record_asks` row used on commissions, logs it on the record, and pings Alerts. Not a chat product. No email or SMS to the tagged person. Seeded: Javy asked Maya for status on `HO3-ELENA-2026`.

Leads are the person record (name, DOB, contact, address, insurance wanted). Dec / 4-point / wind mit drop lives on **Deals**. Click path and leftover bugs live in `COORDINATION.md`.

Docker: `docker compose up --build` (same port).

## Seeded click-through

- **Elena Ruiz · Melbourne HO3** — Lead (person only) → Deal (source docs + shop) → Quote Sheet → Contact + Policy `HO3-ELENA-2026`. Linked business **Ruiz Tile LLC** has no commercial policy. Dec / 4-point / wind mit drop lives on **Deals**, not Leads.
- **Harbor Key Marine LLC** — commercial Closed Won. EIN 59-1234567, GL policy `GL-HARBOR-2026` on the Business. COI stub on the Business. Not Keystone Holdings (`TR-GL-22019`).
- **Ana Dib HO3** — `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Stage **Quote Sent**, unbound, Cov A **$321,000**. Do not bind. Do not edit that fixture.
- **Ortega · Winter Garden HO3** — inland masonry shop for Markets auto-fits.
- **Rosa Keene** — open merge pair on email (do not merge Ana).
- Wave-1 book names when seeded: Mario Cromartie, Virginia Palacios, Fritzs Seraphin, VP Painting & Construction.

Super-Copy, Send to Fill, and Forms Fill read the same `quote_sheets` row.

## Communication (this desk)

- **Ask a teammate** on Policy / Contact / Lead / Deal / Business / Carrier. Tag dropdown is required. Seeded Javy → Maya on `HO3-ELENA-2026`. Writes a durable activity log + Alerts ping.
- **Activities** on Account 360: task / meeting / call. Calls need duration + outcome.
- **Click-to-call** writes an in-app Alerts ping only (`/phone` is a stub). No email.
- **Email templates + triggers** live under Settings as stubs. Nothing sends.
- **Alerts** stay in-desk (asks + work-queue pings).

## Tests

```bash
npm test
```

## Out of scope

Multi-tenant isolation, credential vaults, billing, live Zoho writes, rater APIs, fake AI scores, emails, building a second CRM.
