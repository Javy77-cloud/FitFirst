# Parallel-agent coordination

## Shared funnel (do not fork)

One path for the first test platform. Lifecycle-wiring must call these hooks — do not add a second bind or policy insert.

**Lead (or dec drop) → Deal → finalized quotes attach PDFs on the Deal → Bind → Contact (personal) or Business (commercial) → one Policy per line.**

Quotes never create a Policy.

Shared hooks in `src/lib/lifecycle/hooks.ts`:

- `attachFinalizedQuotePdfs(dealId)` — idempotent; call after stub quotes are written
- `planBind` / `bindDeal` — only policy write path
- `QUOTE_CREATES_POLICY === false`

`shopInAppetite` already calls `attachFinalizedQuotePdfs` after quotes are inserted. Do not change filter-first matching. Do not edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`.

## CRM UI + bind / history

Owns screens and bind. Additive columns: `contacts.account_kind`, `contacts.legal_name`, `contacts.active_policy_count`, `documents.quote_id`.

### Lists / pipeline chrome (this slice)

- Pipeline (`/pipeline`): kanban columns, Create, admin stage editor (add / delete / relabel). Bound is locked. View switcher: Columns + List of the same shops.
- Sitewide `ColumnPicker` on Deals, Contacts, Businesses, Policies, Carriers, Tasks, Leads, decline log. Layout is **per desk agent** (`column_layouts`). Agency/admin may save a default; that agent’s override wins. Colors/fonts stay on the admin-branding sibling.
- Deals list is a full worksheet (not 3 columns) with row-level call / SMS / email / task (in-desk only).
- Contacts = personal; Businesses = `account_kind = commercial`. Policies: P&C / Life / Health, then P&C Home / Auto / Commercial. Column is **Insured / contact name** (never Party); link uses `insuredHref`.
- Tasks (`/tasks`): add / edit / delete. Reviews stays the open queue.
- Additive: `pipeline_stages` (`drizzle/0003_pipeline_stages.sql`), `desk_agents` + `column_layouts` (`drizzle/0004_desk_agents_column_layouts.sql`).

### Files owned

- `src/lib/crm/**`
- `src/lib/lifecycle/hooks.ts` — re-exports only; lifecycle-wiring should import from here
- `src/app/actions/crm.ts` — lead, dec drop, deal, contact, **bindDeal**, pipeline stages, deal outreach
- `src/app/actions/alerts.ts` — task complete / create / update / delete
- `src/app/leads/**`, `src/app/contacts/**`, `src/app/businesses/**`, `src/app/policies/**`, `src/app/reviews/**`, `src/app/tasks/**`, `src/app/pipeline/**`
- `src/app/deals/page.tsx`, `src/app/deals/new/page.tsx`
- `src/components/crm/**`
- `src/app/api/documents/[id]/route.ts`

### Shared (additive)

- `src/lib/db/schema.ts` / `drizzle/0002_crm_account_kind_and_quote_docs.sql`
- `src/lib/db/queries.ts` — CRM reads; `boundPolicy` / `dealTasks` / account joins
- `src/app/deals/[id]/page.tsx` — bind card, breadcrumb, quote PDF pass-through
- `src/app/actions/quotes.ts` — **only** the finalize hook call after quotes exist
- `src/app/actions/documents.ts` — exported `persistFile` / `extractDocument`
- `src/components/deal/quotes-panel.tsx`, `documents-panel.tsx` — PDF open links
- `src/app/page.tsx`, `src/app/alerts/page.tsx`, `src/components/app-shell.tsx`

### Contract

- Bind is the only path that inserts `policies`.
- One active policy per account + line; a later bind of the same line marks the prior `replaced` and increments lifetime only.
- Commercial (`GL` default, or bind form) uses the same `contacts` row with `account_kind = commercial` — no second account table.
- Life / health: CRM notes only.
