# FitFirst

P&C insurance CRM and comparative quote rater for a Florida personal-lines desk. The differentiator is an **appetite-learning log**: filter carriers first, skip known declines, and only rank markets that fit.

This is not a Zoho clone and does not call a live CRM. The locked lifecycle is:

1. Lead arrives (manual, email/social stub, or a dropped dec / wind mit / 4-point / inspection). Match name + phone or email; never duplicate.
2. Convert Lead → Deal. The Deal is the shopping record. Source docs live on the deal. Fill Quote Sheet blanks (yellow missing / blue CHECK). **Do not create a Policy from a quote.**
3. Finalize quotes: issued-quote PDFs + a ranked quote-results note (cheapest first).
4. Bind / Closed Won: Deal produces a Contact (personal) or a Business/Account (commercial), copies matching fields, then one Policy per bound line (Bound / Pending / Active only).
5. Every Policy is its own record. Contact and Business show lifetime + active/bound/pending counts. Same person can hold personal policies and be linked to a Business.
6. Client = any related policy is Active, Bound, or Pending. Former Client only if they once had one and now have zero.

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

Open [http://localhost:43147](http://localhost:43147). Start at **Get Started**.

## First path to exercise

`npm run db:seed` loads two required records:

- **Elena Ruiz · Melbourne HO3** — personal-lines click-through. Dropped dec → Lead → Deal (Quote Sheet + source docs + quote PDFs + ranked note) → bind → Contact + one HO3 Policy. Lifetime 1, in-force 1, status Client. Linked business **Ruiz Tile LLC** has no commercial policy.
- **Ana Dib HO3 shop** from `src/lib/fixtures/ana-dib-ho3-2026-09-02.json` (2026-09-02, Palm Bay / Brevard). HO3-only seed. Cov A **$321,000**. Eight markets, zero bindable. **Do not bind Ana. Do not change that number.**

Exact click path is in `COORDINATION.md`.

## Schema

Every table has `tenant_id` from day one. Runtime is single-tenant (`TENANT_ID` in `.env`). No multi-tenant isolation, credential vault, billing, or Zoho sync.

Checked-in SQL is under `drizzle/`. Regenerated with `npm run db:generate`.

## Tests

```bash
npm test
```

Covers appetite matching (filter-first, learned declines, RCE floors), extraction confidence, lead match (never duplicate), client status, ranked quote notes, and Quote Sheet blanks-only fill.

## Restyle

Colors, radii, and density live in `src/app/globals.css` as `--ff-*` tokens mapped to shadcn variables. Do not hardcode palette values in feature logic.

## Out of scope (intentionally)

Multi-tenant isolation, credential vaults, billing, life/health rating, real carrier portal macros, Zoho sync, rater APIs, fake AI scores.
