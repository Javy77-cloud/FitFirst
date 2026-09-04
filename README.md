# FitFirst

Owner desk for a Florida P&C agency: filter-first shopping, Quote Sheet, bind to Contact or Business, then Policy. Quotes are not coverage.

This is not a Zoho clone and does not call a live CRM or rater. Runtime is single-tenant (`TENANT_ID`). Every table has `tenant_id`.

**Mac desk-test branch:** `cursor/desk-merge-unblock-f2e7` (compile umbrella + CRM + AMS/OPS + list JSX + comms UUID guard).

## Run locally (Mac)

```bash
git fetch origin cursor/desk-merge-unblock-f2e7
git checkout cursor/desk-merge-unblock-f2e7
git pull origin cursor/desk-merge-unblock-f2e7
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
- **Ana Dib HO3** — `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Stage **shopping**, unbound, Cov A **$321,000**. Do not bind. Do not edit that fixture.
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
