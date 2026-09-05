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

Open [http://localhost:43147](http://localhost:43147).

Demo login (MFA bypass): **javy@fitfirst.local** / **javy** (Admin) or **maya@fitfirst.local** / **maya** (Agent). Switch users from the left-nav footer or `/login`.

## Pipeline views + status colors (this slice)

Small UX pass. Board and Table stay as they were. A third **Funnel** view summarizes deal counts by stage. Click a stage bar (or a stage chip) to open Table filtered to that stage.

Every pipeline stage has a persisted color on `pipeline_stages.color` (additive `0048`). Defaults follow stage order / known slugs (blue / teal / amber / violet / green / rose). Admin can keep the defaults.

Policy and client statuses use the same `StatusBadge` helper:

- Policy: Active, Inactive, Bound, Pending, Lapse, Cancellation, Non-renewal, plus Expired / Cancelled
- Client: Client, Former Client, Not a client; Prospect / Lead if those labels appear

Main surfaces: Pipeline board / table / funnel, Policies list + detail, Contact and Business lists + detail headers, related policy tables.

**Ana Dib HO3** stays shopping / unbound / Cov A **$321,000**. Do not bind.

Sidebar stays darker blue (`#1d4e89`). One Pipeline nav row. One Settings row.

## Test notes (localhost:43147)

1. Sign in as Javy. Open **Pipeline**. Confirm Board | Table | Funnel.
2. Funnel: each stage has a color chip and a count. Click **Quote Sent** — table filters to that stage. Clear with **Show all stages**.
3. Board columns and table Stage cells use the same chips. Stage chips under the create-deal form match.
4. **Policies**: Active / Bound / Pending / Lapse (and others) are colored badges on the list and the policy header.
5. **Contacts** / **Businesses**: Client vs Former Client badges on the list and the record header.
6. Confirm Ana is still unbound, Cov A $321,000. Do not bind her.

```bash
npm test
```
