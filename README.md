# FitFirst

P&C insurance CRM and comparative quote rater for a Florida personal-lines desk. The differentiator is an **appetite-learning log**: filter carriers first, skip known declines, and only rank markets that fit.

This is not a Zoho clone and does not call a live CRM. The domain follows a solo broker workflow:

- Lead → Deal (shopping) → Contact + Policy **only after bind**
- Quotes live on the deal. A quote never creates a policy.
- One master risk worksheet per property/auto. Source PDFs stay attachments; extracted values land on the master record with a **confidence score**.
- Shop **in-appetite / green** markets first. Yellow is a stretch override. Red is skip.
- Internal alerts stay in-app.

Life and health are CRM notes only. Carrier portal automation is an empty adapter interface — no real logins.

## Run locally

### Docker (app + Postgres)

```bash
cp .env.example .env
docker compose up --build
```

Open [http://localhost:43147](http://localhost:43147).

### App on the host + Postgres in Docker

```bash
docker compose up db -d
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm test
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

## First path to exercise

`npm run db:seed` loads the **Ana Dib HO3 shop** from `src/lib/fixtures/ana-dib-ho3-2026-09-02.json` (2026-09-02, Palm Bay / Brevard). It is required day-one data, not an optional demo.

1. Home → **Open Ana Dib HO3 shop**. 1098 Adige Ct SE, 1989 frame-stucco SFH, 8 mi coast, clay tile + metal, Cov A **$321,000** (broker-tested rebuild — do not change that number). Eight markets, zero bindable.
2. **Documents** → **Sample handwritten wind mit**. Flagged fields stay off the worksheet until you click **Accept**.
3. **Sample clean dec** applies high-confidence values automatically.
4. **Markets** is filter-first: QBE, Benchmark/Hadron, HOC, VYRD, and the house RCE/MSB floors score **red / skip**. American Integrity was quoted at $321k and is still not bindable. Floors are log attempts, not wins. No policy is created from these quotes.
5. Carrier-wide rules (QBE frame+20 mi coast, Benchmark/Hadron aged clay, HOC no NB, VYRD takeout + Brevard $350k) stay distinct from one-house floors (Tailrow $354k, VAVE $418,491, GeoVera $363k, SageSure MSB $349,868). SageSure published min Cov A remains $100k in named counties.

Create your own path from **Leads** or **New shopping deal**. Bind is what creates a policy.

### CRM bind path

1. **Leads** → save a person → **Start shop**, or **Dec drop → deal** (same funnel).
2. The deal is shopping only. When stub quotes are finalized, quote PDFs attach on the deal. A quote never creates a policy.
3. **Bind** writes a personal contact or a commercial business, then **one policy per line**, linked back to the deal. Lifetime and active counts live on the account.
4. Open **Contacts**, **Businesses**, **Policies**, or **Tasks**. Use **Columns** on every table. Layouts are per desk agent (sidebar switcher). Agency admin can save a default; an agent override wins for that person. Colors and fonts are not here. Alerts stay in the desk.

### Pipeline and lists

1. **Pipeline** → Columns (kanban) or List. Filter by name / phone / stage / line / state. **Create deal** is on the board. **Admin stage editor** adds / relabels / deletes columns. Bound cannot be deleted; bind is the only way in.
2. **Deals** list starts with deal, Call / SMS / Email / Task, insured name, phone, email, address, stage, line, state, city, and Cov A. Dial or Copy from the row — do not open the shop just to grab a number. Call / SMS / Email / Task log in one click (desk only — nothing is sent). **Columns** persist per desk agent and save when you toggle a checkbox.
3. Type a name once on a lead or new deal. It becomes the insured name. Bind copies phone, email, and address onto the contact — no second entry.
4. **Contacts** is the personal book; **Businesses** is commercial. Phone and email are linked (`tel:` / `mailto:`) with Copy.
5. **Policies** → P&C / Life / Health, then Home / Auto / Commercial. The name column is **Insured / contact name**, not Party. Policy number and phone copy from the row.
6. **Tasks** → add, edit, delete. Reviews remains the open queue + 90-day expirations.

Life and health deals are CRM notes with a rating placeholder. They still bind the same way.

## Schema

Every table has `tenant_id` from day one. Runtime is single-tenant (`TENANT_ID` in `.env`). No multi-tenant isolation, credential vault, billing, or Zoho sync.

Checked-in SQL is under `drizzle/`. Regenerated with `npm run db:generate`.

## Tests

```bash
npm test
```

Covers appetite matching (filter-first, learned declines, RCE floors) and extraction confidence (clean dec vs messy wind mit).

## Restyle

Colors, radii, and density live in `src/app/globals.css` as `--ff-*` tokens mapped to shadcn variables. Do not hardcode palette values in feature logic.

## Out of scope (intentionally)

Multi-tenant isolation, credential vaults, billing, life/health rating, real carrier portal macros, Zoho sync.
