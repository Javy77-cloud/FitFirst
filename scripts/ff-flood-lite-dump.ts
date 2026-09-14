import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets, deals } from "../src/lib/db/schema";

const FLOOD = "fa61a32c-5351-4c43-8f91-2f92ef83b123";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, FLOOD)).limit(1);
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, FLOOD), eq(quoteSheets.line, "flood")));
  if (!sheet) throw new Error("no flood sheet");
  const values = (sheet.values || {}) as Record<string, any>;
  const filled: Record<string, string> = {};
  const empty: string[] = [];
  for (const [k, cell] of Object.entries(values)) {
    const v = cell?.value;
    if (v != null && String(v).trim() !== "") filled[k] = String(v);
    else empty.push(k);
  }
  const keys = [
    "insured_first_name","insured_last_name","insured_dob","insured_email","insured_phone",
    "property_address","property_city","property_state","property_zip","county",
    "flood_zone","firm_panel","bfe","community_number","sfha","flood_zone_source",
    "year_built","sqft","stories","foundation_type","occupancy","construction_type",
    "building_limit","contents_limit","building_deductible","contents_deductible",
    "has_nfip","under_construction","over_water","substantially_improved","enclosure_present",
    "elevation_certificate","ec_on_file","prior_flood_claims","effective_date",
  ];
  const highlight: Record<string, string> = {};
  for (const k of keys) if (filled[k] != null) highlight[k] = filled[k];
  console.log(JSON.stringify({
    dealId: FLOOD,
    dealName: (deal as any)?.name,
    sheetId: sheet.id,
    filledCount: Object.keys(filled).length,
    highlight,
    filled,
    emptyKeys: empty.sort(),
  }, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
