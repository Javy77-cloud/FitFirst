# FitFirst carrier appetite packs

Two CSV packs write the same `carrier_appetite` table. Import is **upsert by
`(tenant_id, carrier_id)`** — loading nationals does **not** wipe Florida
specialty rows, and vice versa.

| Pack | File | What it is |
| --- | --- | --- |
| FL specialty | `fitfirst-fl-specialty-appetite.csv` | FL/SE property specialists + a few specialty/E&S rows already on main (Appetite v1). |
| Nationals | `fitfirst-nationals-appetite.csv` | Major P&C nationals + **Citizens** as a normal FL residual-market row. |
| State overlays | `fitfirst-nationals-state-rules.csv` | Per-state posture so “CA new HO closed” does not imply nationwide closed. |

```bash
npm run appetite:import              # FL specialty (default)
npm run appetite:import-nationals    # nationals + state-rule overlays
# or pass paths:
npx tsx --env-file=.env scripts/import-appetite.ts data/appetite/fitfirst-nationals-appetite.csv
```

Identity is the slug `carrier_id`. One record per company. Never merge
`universal_pc` (Universal Property & Casualty) with `uicna` (UICNA). Never merge
Liberty Mutual with Safeco.

## How the packs coexist in the quote-gate

1. Both packs load into `carrier_appetite` for the tenant.
2. The gate evaluates **rateable** rows together.
3. Florida HO3/HO6/DP still uses `DEFAULT_FL_HO_ORDER` (FL specialists first).
   Nationals are **not** in that list, so they cannot outrank Slide / Universal
   P&C / Tower Hill / etc. for FL HO.
4. **Citizens** is a normal catalog row (`citizens`, FL only, HO/DP). Quoting
   still depends on the agency’s appointment. There is **no** last-resort /
   “within 20%” ranking — that stub is not part of this pack.
5. `states_available` is expanded from the CSV token. `US` becomes all 50
   **only** when the source token is literally `US` (used here only when that
   line is truly nationwide — Progressive/GEICO auto, State Farm, Allstate auto,
   USAA membership). Fuzzy tokens like `45_plus_US_states` / `other` store the
   **explicit listed states only** and set `needs_state_confirm`.

## Per-state overlays (`appetite_state_rules`)

A single `states_available` list is too coarse for nationals (State Farm still
writes CA auto; CA **new homeowners** is closed). Overlays are keyed by
`(tenant_id, carrier_id, state)` and may filter by `lines`:

- Merge extra `hard_declines` / `soft_cautions` / notes onto the carrier for
  that state.
- `cat_posture = closed_new_biz` on a matching line → Skip-Decline
  (`closed_new_biz`) without closing the carrier nationwide.

Research-dated facts in the nationals pack (2026-09):

- State Farm CA new homeowners = `closed_new_biz`
- Allstate CA new homeowners = still closed
- Progressive = auto-first, not a property leader; **no new DP-3**

## Learning / decision model (tenant + state)

Raw quote-gate decisions stay **tenant-walled**. They are also **state-keyed**
so two agencies in the same state quoting the same `carrier_id` improve that
state’s accuracy without mixing CA into FL.

| Store | Key | Role |
| --- | --- | --- |
| `appetite_quote_decisions` | `(tenant_id, risk_state, carrier_id)` + `risk_line` | Agent-visible Yes/Maybe/Skip log. Additive `risk_state` / `risk_line`. |
| Tenant accuracy | `tenant_id + risk_state + carrier_id` | One agency’s book in one state. |
| Shared state accuracy | `risk_state + carrier_id` | Rollup across tenants in the same state (no deal ids). |
| `appetite_partitions` | `(tenant_id, state, line)` | Existing shadow-learning partition (already state-keyed). |
| `appetite_shadow_predictions` | partition + additive `risk_state` / `risk_line` | Shadow predict writeback. |

Writes never drop `tenant_id`. Cross-agency learning is a **read-time rollup**
on `(risk_state, carrier_id)`, not a merged write path.

Life/health nationals are out of scope (not in this pack). All seeded P&C
nationals are `rateable=true`.

## Life UW MATRIX (condition × product)

| Pack | File | What it is |
| --- | --- | --- |
| Life MATRIX | `fitfirst-life-uw-matrix.csv` | Javy Life underwriting appetite by condition × product. Screenshot seed only. |

This file is **not** imported into `carrier_appetite` (that table is P&C quote-gate). The Life Markets / Quotes helper reads the CSV directly.

Columns: `carrier_slug`, `carrier_name`, `product_slug`, `product_name`, `condition_key`, `outcome`, `rule_text`, `age_min`, `age_max`, `coverage`, `source`.

- `coverage=incomplete` catalog rows list MATRIX products with no cell rule yet.
- `coverage=seeded` rows are the only production outcomes. v1 only seeds conditions that appear **uniform decline** across visible screenshot columns (AIDS/HIV, ALS, Alzheimer’s, Dementia, Cystic fibrosis).
- Do **not** invent Accept / Graded / Preferred cells from screenshots. Unknown is the honest default.
- Replace/expand this file when Javy uploads the spreadsheet — full MATRIX when spreadsheet provided.

## Life build / BMI (height × weight) — second predictor input

| Pack | File | What it is |
| --- | --- | --- |
| Life build | `fitfirst-life-build.csv` | Javy MATRIX height/weight (or BMI-style) tabs, flattened. Header-only until those tabs land. |

Condition × product is **primary**. Height/weight is a **second** input: the predictor maps Risk Profile height + weight (and optional Deal Details sex) to a build/BMI band, then can adjust Accept / Graded / Decline **alongside** medical conditions.

- Do **not** invent WHO or carrier build charts. The live CSV is header-only; `band` stays `unknown` and the helper shows “table pending.”
- When rows land, lookup matches `height_inches` + `weight_min`/`weight_max` (classic chart) and/or `bmi_min`/`bmi_max` (BMI-style tab). Empty `carrier_slug` / `product_slug` applies to every MATRIX product; empty `sex` applies to both.
- Combine is worst-wins, with Unknown never upgrading to Accept: a green build row cannot mint a missing condition cell. Decline from either input wins. Graded/call-carrier from build can still surface when conditions are Unknown.
- Flatten incoming sheet tabs into this file — full MATRIX when spreadsheet provided.
