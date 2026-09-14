import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";

async function main() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const v = sheet.values as Record<string, any>;
  for (const k of [
    "construction",
    "construction_type",
    "square_feet",
    "building_sqft",
    "stories",
    "number_of_floors",
    "year_built",
    "county",
    "parcel_id",
    "assessed_value",
    "roof_covering",
    "address1",
    "city",
    "zip",
  ]) {
    const cell = v[k];
    console.log(k, cell ? `${JSON.stringify(cell.value)}|${cell.source}|${cell.sourceLabel ?? ""}` : "MISSING");
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
