# FitFirst

P&C insurance CRM and comparative quote rater for a Florida personal-lines desk. The differentiator is an **appetite-learning log**: filter carriers first, skip known declines, and only rank markets that fit.

This is not a Zoho clone and does not call a live CRM. The domain follows a solo broker workflow:

- Lead → Deal (shopping) → **one Quote Sheet per line** → Contact + Policy **only after bind**
- Quotes live on the deal. A quote never creates a policy.
- Agents hand over whatever they have (dec, wind mit, 4-point, photos, notes, competing quote). **Fill Quote Sheet is in the product** (no bot) and writes extracted values into blank fields. **Copy sheet** puts a labeled pack on the clipboard for Gaya or the agent. Super-Copy JSON stays as a download. Pasting into TypTap or any carrier portal is a human or a quoting bot — FitFirst does not log into carriers. Raw PDFs stay on Files.
- Yellow = missing. Blue = CHECK (extracted, unconfirmed). A Javy-tested Cov A is confirmed, never CHECK.
- People and DOB live on the Contact.
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

`npm run db:seed` loads three shops.

### Ana Dib HO3 (complete Home sheet)

From `src/lib/fixtures/ana-dib-ho3-2026-09-02.json` (2026-09-02, Palm Bay / Brevard). Required day-one data. **Do not edit that fixture.**

1. Home → **Open Ana Dib HO3 shop**.
2. **Home** Quote Sheet is already filled from seed. Cov A **$321,000** is broker-tested (Javy) — confirmed, not CHECK, not a Zillow Zestimate.
3. Header glance shows coverage amount and the property one-liner. Zillow / FEMA are address links only.
4. **Copy sheet** puts a labeled field pack on the clipboard (`copy from this, not the PDFs`). **Super-Copy JSON** is the same packet as a download. Print / PDF is available. Portal paste is still you or a bot — no TypTap login in FitFirst.
5. **Markets** is still filter-first: QBE, Benchmark/Hadron, HOC, VYRD, and the house RCE/MSB floors score **red / skip**. American Integrity was quoted at $321k and is still not bindable.

### Ortega Melbourne fill demo

1. Home → **Ortega fill-demo shop** (or Deals).
2. Home Quote Sheet starts blank (yellow).
3. Drop a dec on the sheet (or click **Fill from files already on this deal**). Every labeled field on the page maps — not a 12-field subset.
4. Leftover blanks gap-fill from public listing / county / FEMA facts. The uploaded page wins on conflict. Each cell is tagged with its source. Zestimate is never Cov A.

### Francisco Javier Garcia shop

Zoho Contact `6742853000009315243` (email javyspain2004@gmail.com, DOB 1977-07-11, mobile 801-400-6160). Zoho had **no mailing street**. Seeded as a shopping deal with a full-page HO3 + auto sample dec on Files so you can click Fill and see the whole-page mapper. No policy.

Create your own path from the **desk drop** (dec → Lead → Deal → filled Quote Sheet), **Leads**, or **New shopping deal**. Source docs never create a policy. Bind is what creates Contact + Policy.

## Schema

Every table has `tenant_id` from day one. Runtime is single-tenant (`TENANT_ID` in `.env`). No multi-tenant isolation, credential vault, billing, or Zoho sync.

New desk tables: `quote_sheets` (one per deal per line) and `extraction_jobs`. Deal glance columns: `shop_lines`, `coverage_amount`, `property_oneliner`, `current_carrier`.

Checked-in SQL is under `drizzle/`. Regenerated with `npm run db:generate`. See `COORDINATION.md`.

## Tests

```bash
npm test
```

Covers appetite matching (filter-first, learned declines, RCE floors), extraction confidence (clean dec vs messy wind mit), Quote Sheet fill-blanks-only (including Javy Cov A), Super-Copy / Copy sheet packs, the photo-a-dec OCR hook (`not_implemented`, does not block text fill), and Zillow/FEMA link builders.

## Restyle

Colors, radii, and density live in `src/app/globals.css` as `--ff-*` tokens mapped to shadcn variables. Quote Sheet yellow/blue use `--ff-yellow-bg` and `--ff-check-bg`. Do not hardcode palette values in feature logic.

## Out of scope (intentionally)

Multi-tenant isolation, credential vaults, billing, life/health rating, real carrier portal macros, Zoho sync, paid OCR vendors.
