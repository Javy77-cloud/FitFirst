# FitFirst coordination

This file is the handshake for additive desk work. Do not invent a second CRM shape.

## Quote Sheet is the master

- One editable Quote Sheet per deal line (`quote_sheets`). Super-Copy / a rater copies **from the sheet**, never from PDFs.
- Source files (dec, wind mit, 4-point, photos, competing quotes, notes) live on `documents`. They stay attachments.
- **Fill Quote Sheet** extracts into **blank** fields only. Never overwrite a value the agent typed or a seeded confirmed value.
- Yellow (`--ff-yellow-bg`) = missing. Blue (`--ff-check-bg`) = CHECK (extracted, unconfirmed).
- Javy-tested Coverage A (Ana Dib $321,000, `source: javy`) is **confirmed**. Never flag it CHECK. Never overwrite it.
- People and DOB live on `contacts`. Do not duplicate them as the Quote Sheet source of truth.
- Deal header (`coverage_amount`, `property_oneliner`, `current_carrier`) is a glance. After fill, copy matching values onto **header blanks only**.

## Lines

Tabs: Home, Auto, Rec/RV, Flood, Umbrella, Life, Health, Workers Comp, General Liability.
Show the tabs that apply (`deals.shop_lines`). Home + Auto are first-class (deep enough to shop FL HO / auto). WC / GL / RV are thinner.

## Ingest

- Upload / drop stores a `documents` row. It does not write the sheet.
- Text PDFs and `.txt` use `pdf-parse` + `extractFieldsFromText`.
- Images create an `extraction_jobs` row with engine `ocr` and status `not_implemented`. No paid OCR vendor.
- Job rows must exist even when OCR is stubbed.

## Public address links

`src/lib/address-links.ts` + `src/components/address-links.tsx` — Zillow search and FEMA MSC flood map are outbound `target=_blank rel=noopener` tabs only. Never fetch those sites, never store Zestimate / list price, never use either as Cov A. Hide when street is empty.

## Schema / tokens / fixtures

- New tables carry `tenant_id`. Migrations are additive. Checked-in SQL is under `drizzle/`.
- Restyle through `--ff-*` tokens in `src/app/globals.css`. Do not hardcode palette values in feature logic.
- **Do not edit** `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Seed Ana Home from it.
- Do not change filter-first matching (`src/lib/appetite/match.ts`).

## Out of scope

Live Zoho sync, real carrier portal macros, paid OCR, SaaS billing, vaults, multi-tenant isolation.
