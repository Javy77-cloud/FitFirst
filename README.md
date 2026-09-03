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

## Roles and commissions

The desk is solo-now / agency-later. Seed creates **Javy Rivera (Admin)** and **Maya Chen (Agent)**. The rail switcher is the existing dev session — no SSO or invite email. Passwords are hashed at seed time from `DEV_ADMIN_PASSWORD` (local default if unset) and never committed.

- Admin sees every contact, deal, policy, and producer-pay row, and can assign an owner.
- Agent sees only their own book and commissions.
- **Commissions** is producer pay on bound policies (pending / payable / paid / held). Each row stores premium, rate, agency $, producer split $, selling agency (AFA / First Connect / Agentero / Pimsco/Agility / BackNine), and paid date. Ana Dib quote floors are not paid commissions — she stays at $0.
- **Policy commission math** copies live Zoho Policies. Open **Policies** and click a seeded live-copy number. Enter Selling Agency, line, and GWP. Rate % fills from the live desk (agency + line). TAC / initial / deferred / monthly fill themselves — do not retype them. There is no New-vs-Renewal field. Saving stores the inputs locally — it does not write to Zoho. Mark paid does not change Policy status.

### What to click (commission math)

Stay **Javy Rivera (Admin)**. Ana Dib is unbound and is not in this list (Cov A stays **$321,000**).

1. **Policies** → **359207-97** (Ochoa, Life / Accidental Death / BackNine). TAC $496.32, Initial $372.24, Deferred $124.08, Monthly $0. Change Insurance Type to Health or P&C to see the same layout switch fields (Save writes the new math).
2. **PFL677036-00** (Cromartie, AFA DP3). Commission4 10 → TAC $157.90 (half rate).
3. **WC PC 924909-000** (Palacios, First Connect WC, Monthly). TAC $1,420, Monthly $118.33.
4. **CSG-00544929-00** (Logan, Agentero GL). Commission4 14 → TAC $50.26 (full %, not halved).
5. **Marketplace** (Mcalister). PMPM $30 × 2 insured = Monthly $60, TAC $720. Commission4 hidden.
6. **Medicare** (Seraphin). One-time TAC $363. Monthly $0.
7. **451188218** (Valencia, Supplemental). Commission4 25 → Monthly $28.87, TAC $346.47.
8. **Commissions** still lists Hale / Ruiz / Harbor Key. **Mark paid** logs producer pay only.
- Admin can **mark paid**. That logs who did it on `commission_events` and leaves Policy status alone. This is not QuickBooks, Applied Pay, or insured premium collection.
- Filters: date, carrier, line, agent, selling agency, plus the existing 30-day / quarter / FY windows. Per-agent report is `/commissions/agents/[id]`.
- Switch to **Maya Chen (Agent)** in the rail to see only her paid/unpaid rows (Ruiz HO pending, Ruiz auto paid). Harbor Key Marine is commercial (GL pending, BOP paid) on Javy's book.
- An **ask** is a short note on a commission or policy (`what about this?` / request payout). Open or done. Admin marks resolved. Not chat. No emails to the broker or agents.

## Schema

Every table has `tenant_id` from day one. Runtime is single-tenant (`TENANT_ID` in `.env`). No multi-tenant isolation, credential vault, billing, or Zoho sync.

Checked-in SQL is under `drizzle/`. Regenerated with `npm run db:generate`. Additive migrations only.

## Tests

```bash
npm test
```

Covers appetite matching (filter-first, learned declines, RCE floors), extraction confidence (clean dec vs messy wind mit), RBAC owner scope, and commission rollups.

## Restyle

Colors, radii, and density live in `src/app/globals.css` as `--ff-*` tokens mapped to shadcn variables. Do not hardcode palette values in feature logic.

## Out of scope (intentionally)

Multi-tenant isolation, credential vaults, billing, life/health rating, real carrier portal macros, Zoho sync.
