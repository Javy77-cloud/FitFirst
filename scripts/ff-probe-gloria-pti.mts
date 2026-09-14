import { db } from "/Users/franciscogarcia/FitFirst/src/lib/db";
import { sql } from "drizzle-orm";

const HO3 = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

function cell(v: any) {
  if (!v || typeof v !== "object") return { value: v ?? "", source: "", status: "" };
  return { value: v.value ?? "", source: v.source ?? "", status: v.status ?? "", sourceLabel: v.sourceLabel ?? "" };
}

async function main() {
  const carriers = await db.execute(sql`
    select id, name, portal_url, agent_portal_url, portal_login, portal_username_hint,
           phone, email, appetite_notes is not null as has_notes,
           jsonb_array_length(coalesce(appetite_rows, '[]'::jsonb)) as appetite_rows_len
    from carriers
    where name ilike '%people%' or name ilike '%pti%' or name ilike '%slate%'
       or name ilike '%trust%'
    order by name
  `);
  console.log("CARRIERS", JSON.stringify(carriers, null, 2));

  const sheets = await db.execute(sql`
    select id, line, updated_at from quote_sheets where deal_id = ${HO3}
  `);
  console.log("SHEETS", JSON.stringify(sheets, null, 2));

  const sheetVals = await db.execute(sql`
    select values from quote_sheets where deal_id = ${HO3} and line = 'home'
  `);
  const values = (sheetVals as any[])[0]?.values ?? {};
  const keys = [
    "roof_shape","roof_covering","roof_year","year_built","stories","square_feet",
    "occupancy","primary_heat","central_air","construction","exterior","garage_type","pool",
    "insurance_score_range"
  ];
  const pick: Record<string, unknown> = {};
  for (const k of keys) pick[k] = cell(values[k]);
  console.log("SHEET_FIELDS", JSON.stringify(pick, null, 2));
  console.log("HAS_CENTRAL_AIR_KEY", "central_air" in values);
  console.log("HAS_INSURANCE_SCORE_KEY", "insurance_score_range" in values);
  console.log("SHEET_KEY_COUNT", Object.keys(values).length);

  const quotes = await db.execute(sql`
    select q.id, q.carrier_id, c.name, q.risk_outcome, q.next_step, q.bindable,
           q.quote_number, q.premium, q.agent_status, q.stub,
           left(q.notes, 160) as notes
    from quotes q
    join carriers c on c.id = q.carrier_id
    where q.deal_id = ${HO3}
    order by c.name
  `);
  console.log("QUOTES", JSON.stringify(quotes, null, 2));

  const risks = await db.execute(sql`
    select id, year_built, roof_year, roof_covering, construction, occupancy, stories,
           pool, protection_class, miles_to_coast, city, county, coverage_a
    from risks where deal_id = ${HO3}
  `);
  console.log("RISK", JSON.stringify(risks, null, 2));

  const defs = await db.execute(sql`
    select key, label, type, options from desk_custom_fields
    where module = 'deals' and (key ilike '%score%' or key ilike '%credit%' or key ilike '%roof%' or key = 'insurance_score_range')
    order by key
  `);
  console.log("FIELD_DEFS", JSON.stringify(defs, null, 2));

  const layout = await db.execute(sql`
    select id, line_of_business, jsonb_pretty(columns) as cols
    from desk_field_layouts
    where module='deals' and (line_of_business='HO' or line_of_business is null)
    limit 2
  `);
  const layoutRow = (layout as any[])[0];
  console.log("LAYOUT_ID", layoutRow?.id, "LOB", layoutRow?.line_of_business);
  const cols = layoutRow?.cols;
  // print section keys only
  try {
    const parsed = typeof cols === "string" ? JSON.parse(cols) : cols;
    for (const c of parsed ?? []) {
      for (const s of c.sections ?? []) {
        console.log(`  SECTION ${s.id} ${s.title ?? s.name ?? ""}: ${(s.fieldKeys ?? []).join(", ")}`);
      }
    }
  } catch (e) {
    console.log("layout parse skip", e);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
