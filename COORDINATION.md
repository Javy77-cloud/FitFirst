# FitFirst parallel-agent coordination

This file lists ownership so slices do not collide. Additive work only. Do not rewrite the schema. Do not edit the Ana Dib HO3 fixture or appetite matching unless that is your slice.

## Roles + commissions + internal asks

Owned by the roles / producer-pay slice. Touch these files for RBAC, commissions, or record asks — do not restyle them into a chat product or SaaS billing.

- `src/lib/auth/` — session cookie, password hash, RBAC helpers and tests
- `src/lib/commissions/` — period windows, rollups, math, tests
- `src/lib/db/schema.ts` — **additive only**: `users`, `agency_settings`, `commissions`, `record_asks`, plus nullable `owner_id` on leads/contacts/deals/policies
- `drizzle/0002_roles_commissions_asks.sql` and matching `drizzle/meta` snapshot
- `src/lib/db/seed-book.ts` — demo users, bound book, producer-pay rows, asks
- `src/lib/db/seed.ts` — calls `seedUsersAndBook()` after the Ana shop (do not turn Ana quotes into paid commissions)
- `src/lib/db/queries.ts` — owner-scoped lists, commission queries, ask queries
- `src/lib/fixtures/ids.ts` — additive user / demo-book IDs only
- `src/lib/domain.ts` — additive role / commission / ask constants
- `src/app/actions/session.ts`, `owners.ts`, `asks.ts`, `commissions.ts`
- `src/app/actions/crm.ts` — sets `owner_id` on create/bind; pending commission on bind when premium is present
- `src/app/commissions/`
- `src/components/actor-switcher.tsx`
- `src/components/owner-select.tsx`
- `src/components/ask-thread.tsx`
- `src/components/commissions/`
- `src/components/app-shell.tsx` — Commissions rail item + acting-as switcher
- `src/app/page.tsx` — commission dashboard widgets
- CRM list pages (`leads`, `contacts`, `deals`, `policies`) — owner column / assign control
- `src/app/deals/[id]/page.tsx` — premium field on bind (creates producer-pay row)

Do **not** edit:

- `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`
- `src/lib/appetite/*`

`tenant_id` stays on every table. No Stripe, vaults, invite email, or SSO in this slice.
