import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const HO3 = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

async function main() {
  const cols = await db.execute(sql`
    select column_name from information_schema.columns
    where table_name = 'desk_field_layouts' order by ordinal_position
  `);
  console.log("layout cols", (cols as any[]).map((c:any)=>c.column_name).join(", "));

  const layouts = await db.execute(sql`select * from desk_field_layouts`);
  for (const row of layouts as any[]) {
    const layout = row.layout ?? row.config ?? row.payload;
    const fieldKeys: string[] = [];
    try {
      for (const col of (layout?.columns ?? [])) {
        for (const sec of col.sections ?? []) fieldKeys.push(...(sec.fieldKeys ?? []));
      }
    } catch {}
    console.log("LAYOUT", JSON.stringify({ id: row.id, module: row.module, line_of_business: row.line_of_business, lob: row.lob, name: row.name, keys: fieldKeys }));
  }

  for (const id of [DP3, HO3]) {
    const vals = await db.execute(sql`
      select field_key, value from desk_custom_field_values
      where record_id = ${id}
      order by field_key
    `);
    console.log("VALUES", id, JSON.stringify(vals, null, 2));
  }

  // getparcel for DP3 miami-dade
  const parcel = await db.execute(sql`
    select qs.values->'parcel_id' as parcel_id,
           qs.values->'assessed_value' as assessed,
           qs.values->'square_feet' as sqft,
           qs.values->'beds' as beds,
           qs.values->'baths' as baths,
           qs.values->'stories' as stories,
           qs.values->'year_built' as yb,
           qs.values->'construction' as construction,
           qs.values->'flood_zone' as flood,
           qs.values->'zoning' as zoning,
           qs.values->'legal_description' as legal,
           qs.values->'assessment_year' as ay,
           qs.values->'mobile_home' as mh,
           qs.values->'form' as form
    from quote_sheets qs where deal_id = ${DP3}
  `);
  console.log("DP3 sheet snippets", JSON.stringify(parcel, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
