import { ilike, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deals } from "../src/lib/db/schema";
import { listFieldDefs } from "../src/lib/custom-fields/store";

async function main() {
  for (const module of ["leads", "deals"] as const) {
    const fields = await listFieldDefs(module);
    const t = fields.find((f) => f.key === "insurance_type");
    const s = fields.find((f) => f.key === "insurance_subtype");
    console.log(module, "type", t?.options, "subtypeCount", s?.options?.length);
  }
  const rows = await db
    .select({ id: deals.id, title: deals.title, lob: deals.lineOfBusiness, quotingForm: deals.quotingForm, policySubType: deals.policySubType })
    .from(deals)
    .where(or(ilike(deals.title, "%Bhattel%"), ilike(deals.title, "%Tyler%")))
    .limit(10);
  console.log("tyler-ish deals", rows);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
