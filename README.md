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

Overnight feel-pass: grouped left nav, named list filters, header column sliders, RecordContextRail, Start Shop, in-desk calendar, quick comms, Choose files, floating Support, settings accordion, widget settings (size + reset), Ask a teammate, HTML 404s, ~15px helper copy.

Home tiles drag from the six-dot handle with a following ghost. Resize is 1×1 / 1×2 / 2×1 / 2×2 inside Widget settings only — resizing widget A must not change widget B’s stored w/h. Layout / Book are compact dropdowns; Widget settings sits at the right of the toolbar.

Today’s batch4 surface: darker blue sidebar (`#1d4e89` / `--ff-sidebar-blue`), admin/agent actor switcher, rich home widgets (contest, lead offers, hit/lost, KPIs, birthdays, renewal risk, mix donut, book scope), Documents / ACORD library, Automations hub, offices + territories, Social/GBP stubs, carrier portal login admin, login/session/MFA.

**Ana Dib HO3** stays shopping / unbound / Cov A **$321,000**. Do not bind.

## Tests

```bash
npm test
```
