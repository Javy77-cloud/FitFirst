# FitFirst parallel-agent coordination

Shared standing model: **filter first, shop greens, yellow = stretch/override, red = skip.** Never submit-to-all-then-rank. Portal adapters stay `not_implemented`. Ana Dib 2026-09-02 HO3 at Cov A **$321,000** must remain **10 skip / 0 green**. Seed file `src/lib/fixtures/ana-dib-ho3-2026-09-02.json` is source of truth — do not invent extra attempts.

Every new table must include `tenant_id`. Runtime stays single-tenant (`TENANT_ID`). Additive Drizzle migrations only. Design tokens live in `src/app/globals.css` as `--ff-*`.

## Locked for everyone

- Do not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`.
- Do not rewrite filter-first matching (`src/lib/appetite/match.ts`).
- Exception: when a `carrier_appointments` row exists and `appointed = false`, matcher/skip may add one extra red (`not_appointed`). Do not change other appetite rules. A missing row is unknown, not a skip.
- No live Zoho, no real email/SMS, no claims, no multi-tenant isolation, no SaaS billing, no vaults, no rater API.

## Carrier appointments (this slice)

Appointments live on the carrier: written line + appointed yes/no + selling agency (`AFA` / `First Connect` / `Agentero`). Table `carrier_appointments`. Shown and editable on `/carriers`.

Seed (Ana fixture untouched):

- First-wave **Home** (`HO`) is `appointed=true` for the ten existing seed carriers.
- Auto / Flood / Umbrella rows are explicit `appointed=false`.
- Selling agencies on those Home rows: AFA (HOC, VYRD, QBE, Benchmark, GeoVera, American Integrity), First Connect (Tailrow, Hadron, SageSure), Agentero (VAVE / Lloyd's).

Quote Sheet / Markets may skip non-appointed lines using the extra red. Keep Ana at 0 green / 10 skip — Home is appointed, so this slice does not change her shop.

Migration: `0002_carrier_appointments.sql`. Next schema change is `0003_*`.

### Files owned

- `src/app/actions/appointments.ts`
- `src/components/carriers/appointment-rows.tsx`
- `src/lib/appetite/rule-input.ts`
- `drizzle/0002_carrier_appointments.sql`

### Shared files (additive only)

- `src/lib/db/schema.ts` — `carrier_appointments`
- `src/lib/db/seed.ts` — appointment rows only
- `src/lib/db/queries.ts` — list / map appointments
- `src/lib/domain.ts` — selling agencies + written-line labels
- `src/lib/appetite/match.ts` — optional `not_appointed` extra red only
- `src/lib/appetite/evaluate-deal.ts` / `src/app/actions/quotes.ts` — pass `appointed` when a row exists
- `src/app/carriers/page.tsx` — show appointments

## Other slices (do not revert)

- Appetite — `src/lib/appetite/**`, Markets tab, decline log
- Quote Sheet — one master sheet per deal line (`quote_sheets` when that slice is present)
- CRM bind / pipeline — bind-only policy insert
- Ops / Settings / Reports — their own tables; do not fork them
