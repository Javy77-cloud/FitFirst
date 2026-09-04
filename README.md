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

Open [http://localhost:43147](http://localhost:43147). Home is the owner desk (paper + terracotta). Demo login: `javy@fitfirst.local` / `javy` (Admin, all book) or `maya@fitfirst.local` / `maya` (Agent, own book).

**Docker Postgres:**

```bash
docker compose up -d db
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

If `db:migrate` / `db:seed` fail after a consolidate pull, reset the local database and run migrate + seed again. Do not edit the Ana Dib fixture.

## Columns picker

On every datasheet (Leads, Deals, Contacts, Businesses, Policies, Carriers, Tasks, Reviews), the **Columns** control sits on the far right of the AppShell title row — same bar as the page title and Smart Search. It does not float over the table body.

## Address autofill

Street / mailing / premises / location fields use `AddressAutofill`. With `GOOGLE_MAPS_API_KEY` or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`, typing a street offers Google Places suggestions and fills city, state, ZIP, and county on the same form. Without a key the desk still loads; those fields are ordinary text inputs.

## Seeded click-through

- **Elena Ruiz · Melbourne HO3** — Lead → Deal → Quote Sheet → Contact + Policy `HO3-ELENA-2026`. Linked business **Ruiz Tile LLC** has no commercial policy.
- **Harbor Key Marine LLC** — commercial Closed Won. EIN 59-1234567, GL policy `GL-HARBOR-2026` on the Business. COI stub on the Business. Not Keystone Holdings (`TR-GL-22019`).
- **Ana Dib HO3** — `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Stage **shopping**, unbound, Cov A **$321,000**. Do not bind. Do not edit that fixture.

Super-Copy, Send to Fill, and Forms Fill read the same `quote_sheets` row. Communications write a durable log on the record. No Twilio, SendGrid, or live Zoho.

## Tests

```bash
npm test
```

## Out of scope

Multi-tenant isolation, credential vaults, billing, live Zoho writes, rater APIs, fake AI scores, emails, building a second CRM.
