# FitFirst

P&C insurance CRM and comparative quote rater for a Florida personal-lines desk. The differentiator is an **appetite-learning log**: filter carriers first, skip known declines, and only rank markets that fit.

This is not a Zoho clone and does not call a live CRM. The domain follows a solo broker workflow:

- Lead → Deal (shopping) → Contact + Policy **only after bind**
- Quotes live on the deal. A quote never creates a policy.
- One master risk worksheet per property/auto. Source PDFs stay attachments; extracted values land on the master record with a **confidence score**.
- Shop **in-appetite / green** markets first. Yellow is a stretch override. Red is skip.
- Internal alerts stay in-app. Client mail (review, check-in, renewal) goes through whichever inbox the tenant connected.

Life and health are CRM notes only. Carrier portal automation is an empty adapter interface — no real logins.

## Run locally

### Docker (app + Postgres)

```bash
cp .env.example .env
docker compose up --build
```

Open [http://localhost:43147](http://localhost:43147).

### App on the host + Postgres in Docker

```bash
docker compose up db -d
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm test
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

## First path to exercise

`npm run db:seed` loads the **Ana Dib HO3 shop** from `src/lib/fixtures/ana-dib-ho3-2026-09-02.json` (2026-09-02, Palm Bay / Brevard). It is required day-one data, not an optional demo.

1. Home → **Open Ana Dib HO3 shop**. 1098 Adige Ct SE, 1989 frame-stucco SFH, 8 mi coast, clay tile + metal, Cov A **$321,000** (broker-tested rebuild — do not change that number). Eight markets, zero bindable.
2. **Documents** → **Sample handwritten wind mit**. Flagged fields stay off the worksheet until you click **Accept**.
3. **Sample clean dec** applies high-confidence values automatically.
4. **Markets** is filter-first: QBE, Benchmark/Hadron, HOC, VYRD, and the house RCE/MSB floors score **red / skip**. American Integrity was quoted at $321k and is still not bindable. Floors are log attempts, not wins. No policy is created from these quotes.
5. Carrier-wide rules (QBE frame+20 mi coast, Benchmark/Hadron aged clay, HOC no NB, VYRD takeout + Brevard $350k) stay distinct from one-house floors (Tailrow $354k, VAVE $418,491, GeoVera $363k, SageSure MSB $349,868). SageSure published min Cov A remains $100k in named counties.

Create your own path from **Leads** or **New shopping deal**. Bind is what creates a policy.

## Email templates and triggers

**Settings → Email templates** is the client-mail library. Every template has English and Spanish. Spanish-preferring contacts get ES; English, Creole, or blank get EN.

Seeded example copy (edit in your voice — no street address is invented):

1. Google review request — Closed Won + 4 days
2. Four-month check-in
3. Renewal awareness (P&C 60 / 30)

**Settings → Email triggers** turns each job on or off, edits the delay, picks the template, and picks send-from (Google / Outlook / Yahoo / Zoho Mail / IMAP). If no inbox is connected, the send stays **queued** with **connect email to send**.

Jobs hang off the **won date** and **policy expiration**. Archiving a deal does not cancel them. Attempted sends land on the contact / deal / policy activity timeline. The broker is never emailed for CRM chores. Ana Dib is never emailed.

Bind (Closed Won) schedules the review and four-month check-in. Seed loads one queued demo on Marcus Bell — not a mass send.

Live OAuth is not implemented. Use **Connect demo** on the triggers page, or the work-email inbox slice when that branch is merged.

## Schema

Every table has `tenant_id` from day one. Runtime is single-tenant (`TENANT_ID` in `.env`). No multi-tenant isolation, credential vault, billing, or Zoho sync.

Checked-in SQL is under `drizzle/`. Regenerated with `npm run db:generate`.

## Tests

```bash
npm test
```

Covers appetite matching (filter-first, learned declines, RCE floors) and extraction confidence (clean dec vs messy wind mit).

## Restyle

Colors, radii, and density live in `src/app/globals.css` as `--ff-*` tokens mapped to shadcn variables. Do not hardcode palette values in feature logic.

## Out of scope (intentionally)

Multi-tenant isolation, credential vaults, billing, life/health rating, real carrier portal macros, Zoho sync.
