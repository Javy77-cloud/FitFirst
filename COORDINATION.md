# FitFirst parallel-agent coordination

This file lists ownership so slices do not collide. Additive work only. Do not rewrite the schema. Do not edit the Ana Dib HO3 fixture or appetite matching unless that is your slice.

## Roles + commissions + internal asks

Owned by the roles / producer-pay slice. Touch these files for RBAC, commissions, or record asks — do not restyle them into a chat product or SaaS billing.

- `src/lib/auth/` — session cookie, password hash, RBAC helpers and tests
- `src/lib/commissions/` — period windows, rollups, math, tests
- `src/lib/db/schema.ts` — **additive only**: `users`, `agency_settings`, `commissions`, `commission_events`, `carrier_goals` (same shape as the book-dashboard slice), `record_asks`, plus nullable `owner_id` on leads/contacts/deals/policies. Commission extras: `agency_amount`, `producer_amount`, `selling_agency`, `paid_by_user_id`
- `drizzle/0002_roles_commissions_asks.sql`, `drizzle/0003_commission_earnings.sql`, and matching `drizzle/meta` snapshots
- `src/lib/db/seed-book.ts` — demo users, bound book, producer-pay rows, asks. Earnings demo: Ruiz HO/auto + Harbor Key Marine GL/BOP. **Ana Dib stays 0 commission.**
- `src/lib/db/seed.ts` — calls `seedUsersAndBook()` after the Ana shop (do not turn Ana quotes into paid commissions)
- `src/lib/db/queries.ts` — owner-scoped lists, commission queries, ask queries
- `src/lib/fixtures/ids.ts` — additive user / demo-book IDs only
- `src/lib/domain.ts` — additive role / commission / ask constants
- `src/app/actions/session.ts`, `owners.ts`, `asks.ts`, `commissions.ts`
- `src/app/api/session/route.ts` — POST sets the `ff_actor` cookie and 303s back (dev role switch)
- `src/app/actions/crm.ts` — sets `owner_id` on create/bind; pending commission on bind when premium is present
- `src/app/commissions/` — agency rollup, per-agent report (`/commissions/agents/[id]`), filters (date / carrier / line / agent), mark paid
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

## Policy commission math (this slice)

Owned here. Copy **live Zoho Policies** field values and formulas. Do not invent rates. Do not look up vendor `P_C_Comm_*` tables.

- `src/lib/commissions/policy-math.ts` — Life / P&C / Marketplace / Medicare Advantage / Supplemental
- `src/lib/commissions/zoho-fields.ts` — live picklists (including Zoho typos)
- `src/lib/commissions/persist.ts` + `GET|POST /api/policies/[id]/commission`
- `src/components/commissions/policy-commission-block.tsx` — one layout; UI switches by Insurance_Type + Policy_Type + Policy_Sub_Type. Mount this on the sibling policy chrome when that page lands.
- `src/app/policies/[id]/page.tsx` — thin record page so the block is clickable on this branch
- `drizzle/0004_policy_commission_math.sql` — additive columns on `policies` and `commissions`
- `src/lib/db/seed-zoho-commissions.ts` — live copies (Ochoa, Cromartie, Palacios, Logan, Mcalister, Seraphin, Valencia). **Ana Dib stays 0 commission / 0 policies.**

Selling agency picklist: AFA, First Connect, Agentero, Pimsco/Agility (Zoho display “Agility”), BackNine. AFA P&C halves Commission4; others use the full %. No New-vs-Renewal field. No live Zoho writes.

## Per-policy earnings (prior slice)

Additive on the commissions module. Do not turn this into QuickBooks, Applied Pay, or premium-trust accounting. Do not take insured premium payments.

- Every bound policy can have one commission row: premium, rate %, agency $, producer split $, pending vs paid, paid date, selling agency (AFA / First Connect / Agentero), carrier, line.
- Admin marks paid. That writes `commission_events` (who / from / to) and does **not** change Policy status.
- Agent role sees only their own paid/unpaid rows and their policies. Admin sees everyone plus the agency rollup.
- Carrier goal progress uses existing `carrier_goals` rows only. If none exist, hide progress — do not invent scores.

Do **not** edit:

- `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`
- `src/lib/appetite/*`

`tenant_id` stays on every table. No Stripe, vaults, invite email, SSO, Twilio, rater API, live Zoho sync, claims, or insured payment processing in this slice.
