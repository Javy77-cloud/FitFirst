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

Communications (email, SMS, calls, meetings, tasks) write a durable log on the Contact, Deal, Policy, Lead, or Business record — inbound and outbound email stay as one conversation. No Twilio or SendGrid.

Click path and leftover bugs live in `COORDINATION.md`.

Docker: `docker compose up --build` (same port).

## Seeded click-through

- **Elena Ruiz · Melbourne HO3** — Lead → Deal → Quote Sheet → Contact + Policy `HO3-ELENA-2026`. Linked business **Ruiz Tile LLC** has no commercial policy.
- **Harbor Key Marine LLC** — commercial Closed Won. EIN 59-1234567, GL policy `GL-HARBOR-2026` on the Business. COI stub on the Business. Not Keystone Holdings (`TR-GL-22019`).
- **Ana Dib HO3** — `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Stage **shopping**, unbound, Cov A **$321,000**. Do not bind. Do not edit that fixture.
- **Ortega · Winter Garden HO3** — inland masonry shop for Markets auto-fits.
- **Rosa Keene** — open merge pair on email (do not merge Ana).
- Wave-1 book names when seeded: Mario Cromartie, Virginia Palacios, Fritzs Seraphin, VP Painting & Construction.

Super-Copy, Send to Fill, and Forms Fill read the same `quote_sheets` row.

## Tests

```bash
npm test
```

## Out of scope

Multi-tenant isolation, credential vaults, billing, live Zoho writes, rater APIs, fake AI scores, emails, building a second CRM.
