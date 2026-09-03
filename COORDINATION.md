# FitFirst agent coordination

Shared notes so parallel work merges instead of overwriting. Do not revert another agent's files. Extend them. Additive schema only. Do not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`.

## Locked for everyone

- Ana Dib 2026-09-02 Palm Bay HO3 is an unbound shop. Coverage A is $321,000. Quotes are not in-force premium.
- `--ff-*` in `src/app/globals.css` is light paper (`--ff-bg` / `--ff-canvas` stay off-white) plus muted terracotta. Never a dark `--ff-bg`.
- No live Zoho, no rater API, no outbound email/SMS, no claims, no multi-tenant isolation, no SaaS billing.

## Owner home (`/`)

Owner: this slice (`cursor/owner-home-desk-a9f3`).

Home is the agency-owner glance at the book. Numbers come from seed rows (policies, deals, review tasks). Widgets that need a table that is not present yet are skipped at runtime via `information_schema` — do not invent commissions / opportunities / work-queue tables here.

### Files owned

- `src/lib/home/**` — as-of clock, line map, aggregate, role scope, optional-table detect, tests
- `src/lib/db/seed-owner-book.ts` — Ruiz, Harbor Key, commercial GL, renewals, lapse, quote-sent, bound-pending
- `src/components/home/**`
- `src/app/queue/page.tsx`

### Shared files (additive only)

- `src/app/page.tsx` — owner desk. Keep the Ana shop as pipeline, not an in-force KPI.
- `src/app/policies/page.tsx` / `src/app/deals/page.tsx` — query-string filters for widget click-through
- `src/lib/db/schema.ts` — **do not add columns**. Home uses tables that already exist.
- `src/lib/db/seed.ts` — calls `seedOwnerBook()` after the Ana shop
- `src/lib/db/queries.ts` — `ownerHomeDashboard`, list filters
- `src/lib/fixtures/ids.ts` — `OWNER_*` / `bb11…` IDs. Ruiz / Patel / Grant reuse opportunities `aa11…` / `aa22…` so merges do not duplicate them
- `src/components/app-shell.tsx` — Home + Queue rail items; light paper sidebar
- `src/app/globals.css` — terracotta / paper tokens (same lock as warmer-desk)

### Role-aware

`src/lib/home/scope.ts`. Admin/owner (default cookie `ff_actor=owner`) sees agency totals. Agent sees only their book when `policies.owner_id` or `assigned_to` exists. Do not invent a second query path.

### Widget skip rules

| Widget | Source | Skip when |
| --- | --- | --- |
| In-force + written this/last month | `policies` status Active/Bound | — |
| Commission pending vs paid | `commissions` | table missing |
| Pipeline | `deals` stages | — |
| Renewals 30/60 | `policies.expiration_date` | — |
| Line / carrier mix | in-force policies | — |
| Needs attention | `review_tasks`, lapsed policies, bound deals with no policy | — |
| Cross-sell gaps | household lines, or `opportunities` count | — |

### Do not

- Bind Ana's 2026-09-02 shop quotes. Do not add `FF-BK-HO-1044` or any HO policy on her contact from this slice.
- Copy `/dashboard` (AMS book board). Extend Home; leave `src/lib/dashboard/**` to the AMS dashboard slice.
- Add fake AI scores or sparklines.

## Other slices (do not restyle their files into this product)

### Book dashboard (`/dashboard`)

`src/lib/dashboard/**`, `src/app/dashboard/**`, their `seed-book.ts`. Widget KPIs, carrier mix, LOB mix, role hook. Home is the owner glance; Book is the deeper board.

### Roles + commissions

`users` / `commissions` / `record_asks`, `owner_id` on CRM rows. Home reads commissions only when the table exists.

### Opportunities worklist

`/opportunities`, `x_dates`, their demo book. Ruiz IDs are shared. Home gap count prefers `opportunities` when that table is present.

### Warmer tokens

`--ff-bg` paper, muted terracotta accent. Home follows that lock.

### Quote-aware pipeline

`quote_sent` / bound stages. Home pipeline widgets click through to `/deals?stage=`.
