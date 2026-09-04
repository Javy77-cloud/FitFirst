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

Open [http://localhost:43147](http://localhost:43147). Home is the owner desk (paper + terracotta). Click path and leftover bugs live in `COORDINATION.md`.

**Home widgets:** each card has a grip (reorder) and a size menu (`1×1` / `1×2` / `2×1` / `2×2` grid spans only). Same blue/orange card chrome at every size. **Reset layout** is in the Agency totals chip. Layout is stored in `localStorage` per book (`ff-home-layout:v1:owner` vs `ff-home-layout:v1:agent:<id>`), so Agency totals and an agent book do not share a grid. Reload keeps your arrangement. Seed KPI math and the Ana unbound $321k shop are unchanged.

**Detail context rail:** task, meeting, lead, claim, deal, contact, policy, and business pages use a sticky right rail (~300px) with Info / Conversations, Send Email, deal summary, and open activities. Open a task from `/tasks` or a calendar event. Ana stays unbound.

**Named list filters:** a slim bar under each list title (status/stage/line chips, Save as…). Saved in `localStorage` per module (`ff-saved-filters:v1:<module>`). On Leads, Deals, Policies, Contacts, Carriers, Businesses, plus Quotes, Claims, Tasks, and Work queue.

**Column visibility:** a quiet sliders icon sits in the last header cell of each list table (not the page chrome). It opens a checklist of fields for that module. Choice is stored in `localStorage` (`ff-list-columns:v1:<module>`). Same modules as named filters; Work queue has two tables (`work-queue-attention`, `work-queue-policies`).

Desk chrome: grouped sidebar (one section open), blue rail with an off-white active row, colored top-bar icons, search left of those icons, in-desk calendar, and **Choose files** on uploads. Start shop from a lead opens a shopping deal. Deal and lead pages use Quick Communications instead of the old quick log. **Support** is a floating Help center (not a sidebar module). Helper / process / cross-sell copy reads at ~15px (`text-base`). Ana Dib stays shopping / unbound / Cov A $321,000.

Docker: `docker compose up --build` (same port).

## Seeded click-through

- **Elena Ruiz · Melbourne HO3** — Lead → Deal → Quote Sheet → Contact + Policy `HO3-ELENA-2026`. Linked business **Ruiz Tile LLC** has no commercial policy.
- **Harbor Key Marine LLC** — commercial Closed Won. EIN 59-1234567, GL policy `GL-HARBOR-2026` on the Business. COI stub on the Business. Not Keystone Holdings (`TR-GL-22019`).
- **Ana Dib HO3** — `src/lib/fixtures/ana-dib-ho3-2026-09-02.json`. Stage **shopping**, unbound, Cov A **$321,000**. Do not bind. Do not edit that fixture.
- **Ortega · Winter Garden HO3** — inland masonry shop for Markets auto-fits.
- **Rosa Keene** — open merge pair on email (do not merge Ana).
- Wave-1 book names when seeded: Mario Cromartie, Virginia Palacios, Fritzs Seraphin, VP Painting & Construction.

Super-Copy, Send to Fill, and Forms Fill read the same `quote_sheets` row.

## Tests

```bash
npm test
```

## Out of scope

Multi-tenant isolation, credential vaults, billing, live Zoho writes, rater APIs, fake AI scores, emails, building a second CRM.
