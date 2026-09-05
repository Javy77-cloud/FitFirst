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

Overnight feel-pass: grouped left nav, named list filters, header column sliders, RecordContextRail, Start Shop, in-desk calendar, quick comms, Choose files, floating Support, settings accordion, widget resize chrome, Ask a teammate, HTML 404s.

Typography: full desk scale-up on a **16px** root. Tailwind `text-sm`/`base`/`lg`/`xl` sit one step larger (15 / 17 / 20 / 22px). Helper **15px**, caption **14px**, `--ff-muted` **#3f4e5c**. Buttons/inputs default **h-9**. Nav items **15px** on a `w-60` rail. Tables **16px**. Leftover 10–13px classes remap through the shared tokens.

Home tiles: drag the grip to reorder, size menu **1×1 / 1×2 / 2×1 / 2×2**, stored in `localStorage` as `ff-home-layout:v1:<book>`. **Reset tile layout** is on the Home header. Line-of-business donut stays 68px.

Today’s batch4 surface: darker blue sidebar (`#1d4e89` / `--ff-sidebar-blue`), admin/agent actor switcher, rich home widgets (contest, lead offers, hit/lost, KPIs, birthdays, renewal risk, mix donut, book scope), Documents / ACORD library, Automations hub, offices + territories, Social/GBP stubs, carrier portal login admin, login/session/MFA.

**Ana Dib HO3** stays shopping / unbound / Cov A **$321,000**. Do not bind.

## AMS wave 2 (this branch)

In-house servicing on Policies that already exist. No IVANS, no rater, no Stripe / Twilio / DocuSign.

- **Policy 360** — servicing checklist (dec, ID cards, AOR, renewal date, next task) plus an endorsement / cancel / non-renew **request → start → file** pipeline. Filing updates the Policy and writes the activity log.
- **Book health** (`/book-health`) — active vs lapsed counts and missing servicing docs.
- **Renewals** (`/renewals`) — upcoming expirations, current vs proposed premium, in-app Task + Alert follow-up.
- **Certificates** (`/certificates`) — COI request queue. Issue still prints a desk stub. **Not a licensed ACORD product.**
- **IVANS / AL3** (`/settings/carrier-download`) — empty importer. Status stays **Not connected**. Attempt import returns `needs carrier download / IVANS later`. No fake carrier fees.

Try: bind is already on Elena `HO3-ELENA-2026` (dec + ID, missing AOR, endorsement in progress). Hale `HP-FL-88421` is in the 30-day renewal window with a compare. Harbor Key has an open COI request for Brevard County Parks. Do not bind Ana.

## Tests

```bash
npm test
```
