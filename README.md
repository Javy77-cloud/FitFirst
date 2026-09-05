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

## What this branch keeps

Overnight feel-pass: grouped left nav, named list filters, header column sliders, RecordContextRail, Start Shop, in-desk calendar, quick comms, Choose files, floating Support, settings accordion, widget resize chrome, Ask a teammate, HTML 404s, ~15px helper copy.

Today’s batch4 surface: darker blue sidebar (`#1d4e89` / `--ff-sidebar-blue`), admin/agent actor switcher, rich home widgets (contest, lead offers, hit/lost, KPIs, birthdays, renewal risk, mix donut, book scope), Documents / ACORD library, Automations hub, offices + territories, Social/GBP stubs, carrier portal login admin, login/session/MFA.

**Ana Dib HO3** stays shopping / unbound / Cov A **$321,000**. Do not bind.

## Tests

```bash
npm test
```

### Quotes list — collapse / actions (this branch)

1. Log in as **javy@fitfirst.local** / **javy**.
2. Open **Quotes**. Confirm the module is still in the left nav (Javy: stay).
3. Each quote is a card. Collapsed cards still show **carrier, premium, status, quote #**.
4. Click **Expand** / **Collapse** on a card. Full detail (why, deductibles, Cov A, gaps) only appears when expanded.
5. Action buttons stay visible on every card whether it is open or closed: Compare, Open PDF / No PDF, Email stub, SMS stub, Mark lost, Open deal. Bound rows show **Hit — policy**.
6. Use the **Bulk** bar: Select all, Compare selected, Expand all, Collapse all. Tick two quotes on Ana’s shop and Compare selected.
7. Ana Dib HO3 stays shopping / unbound at Cov A **$321,000**. Do not bind.
