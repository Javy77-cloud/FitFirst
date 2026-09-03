# FitFirst coordination

This file is the handshake for additive desk work. Do not invent a second CRM shape.

## Quote Sheet is the master

- One editable Quote Sheet per deal line (`quote_sheets`). Copy from the sheet, never from PDFs.
- Source files (dec, wind mit, 4-point, photos, competing quotes, notes) live on `documents`. They stay attachments.
- **Fill Quote Sheet is IN the product** (no bot). It extracts into **blank** fields only. Never overwrite a value the agent typed or a seeded confirmed value.
- **Copy sheet** (clipboard labeled pack) + Super-Copy JSON download are the in-desk paste packet Gaya / the agent uses.
- **Super-Copy INTO carrier portals** (TypTap, Harmony, Swyfft, etc.) stays a human or a quoting bot unless a carrier API exists. Do not build portal macros or carrier logins.
- Yellow (`--ff-yellow-bg`) = missing. Blue (`--ff-check-bg`) = CHECK (extracted, unconfirmed).
- Javy-tested Coverage A (Ana Dib $321,000, `source: javy`) is **confirmed**. Never flag it CHECK. Never overwrite it.
- People and DOB live on `contacts`. Do not duplicate them as the Quote Sheet source of truth.
- Deal header (`coverage_amount`, `property_oneliner`, `current_carrier`) is a glance. After fill, copy matching values onto **header blanks only**.

## Lines

Tabs: Home, Auto, Rec/RV, Flood, Umbrella, Life, Health, Workers Comp, General Liability.
Show the tabs that apply (`deals.shop_lines`). Home + Auto are first-class (deep enough to shop FL HO / auto). WC / GL / RV are thinner.

## Ingest

- Upload / drop stores a `documents` row. It does not write the sheet.
- Text PDFs and `.txt` use `pdf-parse` + `extractFieldsFromText`. **This path is done.**
- Images always go through `classifyIngest` → engine `ocr` → `extractFromImage` → an `extraction_jobs` row. Job rows must exist even when OCR fails.
- `extractFromImage` is **implemented** (tesseract.js, no paid vendor). It OCRs jpg/png/webp/heic and shares `extractFieldsFromText` + `applyExtractedToSheet` with the PDF path.
- Photo fills use source `photo-ocr` and land as CHECK (blue). Missing stays yellow. Never invent Cov A from a Zestimate or guess.
- A photo on the deal does not stop the text/PDF parser from filling blanks.

## Photo OCR + dec coverage (this desk)

Photo-a-dec is a selling point. Fill Quote Sheet works on a phone photo / scan, not just a clean text PDF.

- Fixture: `fixtures/sample-photo-dec.png` (Luis Vega / Cocoa Beach). Seeded on the Vega photo-a-dec shop. **Do not put it on Ana Dib.**
- Full-dec coverage fixture: `fixtures/sample-francisco-garcia-dec.txt` (Francisco / Javier Garcia). Maps named insured, premises, carrier, policy #, form, term, Cov A–F, deductibles, construction, year/roof, occupancy, premium. **Cov A is $280,000 from the dec — not Ana $321k, not a Zestimate.**
- Shared mapper: `extractFieldsFromText` + `applyExtractedToSheet`. Ingest sibling owns upload UX, Lead→Deal, and public-records gap-fill. **Doc / photo-OCR wins over `public` / `public-records`.** Never invent SSN or claims. Never use Zestimate as Cov A.
- Still blanks-only for agent/javy/seed. Still never overwrite Javy-tested Ana Cov A ($321,000).

## Fill vs copy vs portals (locked)

| Action | Where |
| --- | --- |
| Fill Quote Sheet (dec / text PDF → blanks) | In FitFirst |
| Copy sheet (clipboard labeled pack) | In FitFirst |
| Super-Copy JSON / print | In FitFirst |
| Paste into TypTap / any carrier portal | Human or quoting bot |
| Carrier login / portal macros | Out of scope |

## Public address links

`src/lib/address-links.ts` + `src/components/address-links.tsx` — Zillow search and FEMA MSC flood map are outbound `target=_blank rel=noopener` tabs only. Never fetch those sites, never store Zestimate / list price, never use either as Cov A. Hide when street is empty.

## Schema / tokens / fixtures

- New tables carry `tenant_id`. Migrations are additive. Checked-in SQL is under `drizzle/`.
- Restyle through `--ff-*` tokens in `src/app/globals.css`. Do not hardcode palette values in feature logic.
- **Do not edit** `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Seed Ana Home from it.
- Do not change filter-first matching (`src/lib/appetite/match.ts`).

## Out of scope

Live Zoho sync, real carrier portal macros, paid OCR, SaaS billing, vaults, multi-tenant isolation.
