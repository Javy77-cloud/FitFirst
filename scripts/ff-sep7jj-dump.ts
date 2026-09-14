import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const FLOOD = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const HOME = "5ed997ba-21b5-4a70-bdf8-c78810cc79b1";
const keys = [
  "flood_zone","bfe","firm_panel","firm_effective_date","property_address",
  "address1","city","state","zip","mailing_address","parcel_id","county",
  "applicant_gender","applicant_marital_status","applicant_occupation","entity_type",
  "acres","assessed_value","land_value","improvement_value","miles_to_coast",
  "coverage_a","mobile_home","year_effective","building_limit",
];

async function dump(dealId: string, line: string) {
  const [s] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, dealId), eq(quoteSheets.line, line)));
  if (!s) {
    console.log(JSON.stringify({ dealId, line, missing: true }));
    return;
  }
  const v = s.values as Record<string, any>;
  const out: Record<string, any> = {};
  for (const k of keys) {
    out[k] = v[k]
      ? { value: v[k].value, source: v[k].source, status: v[k].status, sourceLabel: v[k].sourceLabel }
      : null;
  }
  console.log(JSON.stringify({ dealId, line, sheetId: s.id, cells: out }, null, 2));
}

async function main() {
  await dump(FLOOD, "flood");
  await dump(HOME, "home");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
