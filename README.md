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

## Quote Sheet (this branch)

Deal tabs are **Documents · Quote Sheet · Markets · Quotes**. Master Risk is not on the Deal.

On **Quote Sheet**:
- Line tabs (Home, plus any other shop lines). Add line opens a blank worksheet.
- **Edit** / **Enter data** unlocks every field. **Save Quote Sheet** / **Cancel** are next to the fields.
- Manual entry works with no PDF. Fill from source docs is optional.
- Toolbar: **Fill from source docs** (needs an uploaded dec), **Copy sheet** (clipboard packet for carrier paste), **Send field sheet** (Fill clipboard + browser handoff — not email).

### How to test at localhost:43147

1. Log in as **javy@fitfirst.local** / **javy**.
2. Open Ana: [http://localhost:43147/deals/22222222-2222-4222-8222-222222222222?tab=quote-sheet&line=home](http://localhost:43147/deals/22222222-2222-4222-8222-222222222222?tab=quote-sheet&line=home). Confirm Cov A is $321,000, shopping / unbound. Do not bind.
3. Click **Edit**. Change a yellow or notes field (leave Cov A alone if you want the Javy-tested tag). **Save Quote Sheet**. Confirm the value stuck. **Cancel** discards an in-progress edit.
4. Confirm there is no **Master Risk** tab. **Markets** and **Quotes** still open. Documents + Quick communications stay on the Deal.
5. On another Deal (or Add line → Auto), open a blank line with no source docs and use **Enter data** to type the sheet without a PDF.

## Tests

```bash
npm test
```
