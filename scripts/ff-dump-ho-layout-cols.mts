import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { fieldsForLine } from "../src/lib/quote-sheet/catalog";

async function main() {
  const row = (await db.execute(sql`
    select columns from desk_field_layouts
    where module='deals' and line_of_business='HO' limit 1
  `)) as any[];
  const cols = row[0]?.columns;
  console.log(JSON.stringify(cols, null, 2).slice(0, 5000));
  const keys: string[] = [];
  for (const c of cols ?? []) for (const s of c.sections ?? []) keys.push(...(s.fieldKeys ?? []));
  console.log("KEYS", keys.join(", "));

  for (const product of ["homeowners", "landlord"] as const) {
    const fields = fieldsForLine("home", product);
    const need = ["construction","form","applicant_gender","applicant_occupation","applicant_employment","applicant_marital_status","applicant_education_level","entity_type","opening_protection","sprinkler","central_alarm","landlord_liability","loss_of_rents","lease_term","tenant_name","mobile_home","building_code"];
    console.log("\nPRODUCT", product, "count", fields.length);
    for (const k of need) {
      const f = fields.find((x) => x.key === k);
      console.log(" ", k, f ? `yes group=${f.group}` : "MISSING");
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
