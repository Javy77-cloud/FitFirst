import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "auto")));
  if (!sheet) throw new Error("no auto sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  const cell = { value: "Acura Financial Services", source: "agent", status: "confirmed" };
  values["vehicle_lienholder"] = cell;
  values["vehicle_1_lienholder"] = cell;
  // Keep ownership Financed if already set; ensure present.
  if (!values["vehicle_ownership"]?.value) {
    values["vehicle_ownership"] = { value: "Financed", source: "agent", status: "confirmed" };
  }
  if (!values["vehicle_1_ownership"]?.value) {
    values["vehicle_1_ownership"] = values["vehicle_ownership"];
  }
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  console.log(
    JSON.stringify({
      sheetId: sheet.id,
      vehicle_ownership: values.vehicle_ownership,
      vehicle_lienholder: values.vehicle_lienholder,
      vehicle_1_lienholder: values.vehicle_1_lienholder,
    }),
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
