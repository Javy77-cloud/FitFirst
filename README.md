# FitFirst

P&C insurance CRM and comparative quote rater for a Florida personal-lines desk. The differentiator is an **appetite-learning log**: filter carriers first, skip known declines, and only rank markets that fit.

This is not a Zoho clone and does not call a live CRM. The domain follows a solo broker workflow:

- Lead → Deal (shopping) → Contact + Policy **only after bind**
- Quotes live on the deal. A quote never creates a policy.
- One master risk worksheet per property/auto. Source PDFs stay attachments; extracted values land on the master record with a **confidence score**.
- Shop **in-appetite / green** markets first. Yellow is a stretch override. Red is skip.
- Internal alerts stay in-app.

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

1. Home → **Open Palm Bay demo shop** (1989 frame SFH, Brevard, 8 mi to coast, clay tile + metal, Cov A $321k — fixture, not production data).
2. **Documents** → **Sample handwritten wind mit**. Flagged fields stay off the worksheet until you click **Accept**.
3. **Sample clean dec** applies high-confidence values automatically.
4. **Markets** shows green / yellow / red from appetite rules + the decline log. The eight-market 2026-09-02 shop is encoded as skips; an example surplus market is the green fit.
5. **Build stub quotes for green markets** writes ranked placeholder quotes. Portal adapters return `not_implemented`.

Create your own path from **Leads** or **New shopping deal**. Bind creates the contact, policy, client history, and 30/60/90 review tasks.

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
