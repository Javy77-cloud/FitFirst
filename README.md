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

## Commissions (`/commissions`)

Cleanup for Javy: no Ask-a-teammate chrome. Agent sees **My commissions**, **Pending**, and **Paid**. Filter insurance type **Life / Health / P&C**, then a subtype (Home / Auto / Flood / Commercial, or Life and Health subs). Admin still gets a simple agency-by-producer rollup. Ana Dib stays shopping / unbound / Cov A **$321,000** — $0 here, no bind.

## Tests

```bash
npm test
```

### Commissions test notes

- `src/lib/commissions/filters.test.ts` — Life / Health / P&C + subtype match (including Zoho-style `insuranceType` + `policySubType` such as DP3 and Accidental Death). Pending includes payable/held; paid is paid only. Agent scope hides other producers. Filter hrefs drop default `all` params.
- `src/lib/commissions/commissions.test.ts` — agency/producer pending vs paid rollups; page source must not mention Ask a teammate.
- `src/lib/desk/record-asks.test.ts` — tagging a `commission` entity is rejected.
- Manual: as Maya, `/commissions` shows only her rows, tabs My commissions / Pending / Paid, no teammate column. As Javy, same filters plus **Agency by producer**. Sidebar stays `#1d4e89`. Do not bind Ana.
