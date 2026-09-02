# Parallel-agent coordination

## CRM UI + bind / history (this slice)

Owns the desk flow: lead → shopping deal → stub bind → contact + policy + tenure + 30/60/90.

**Do not** rewrite schema, touch Zoho, implement carrier portals, edit `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`, or change appetite matching / document extraction.

### Files owned

- `src/lib/crm/**` — bind planner, tenure / expiration helpers, tests
- `src/app/actions/crm.ts` — lead/deal/contact actions; **bind is the only path that inserts a policy from a deal**
- `src/app/actions/alerts.ts` — dismiss + complete-task (writes client history; in-app only)
- `src/app/leads/**`
- `src/app/contacts/**`
- `src/app/policies/**`
- `src/app/reviews/**`
- `src/app/deals/page.tsx`, `src/app/deals/new/page.tsx`
- `src/components/crm/**` — includes server `QueryTabs` for deal/pipeline views (URL `?tab=` / `?view=`)

### Shared files (additive only)

- `src/lib/db/queries.ts` — added `getLead`, `getContactWorkspace`, `getPolicyWorkspace`, `listReviewQueue`, plus `boundPolicy` / `dealTasks` on `getDealWorkspace`
- `src/app/deals/[id]/page.tsx` — bind card / bound summary / life-health placeholder; P&C document/market/quote tabs left in place
- `src/app/page.tsx` — review complete + policy count
- `src/components/app-shell.tsx` — Reviews nav + mobile bar

No new migration. Existing `contacts.tenure_start`, `policy_count`, `life_notes`, `health_notes`, `client_history`, `review_tasks`, and `alerts` cover the screens.

### Contract other slices should keep

- Quotes / `shopInAppetite` must never insert into `policies`.
- Do not move a deal to `bound` except through `bindDeal`.
- Life / health: CRM notes on contact + deal only; no rating UI.
