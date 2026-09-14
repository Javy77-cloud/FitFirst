
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
  const cell = { value: "Financed", source: "agent", status: "confirmed" };
  values["vehicle_ownership"] = cell;
  // also set vehicle_1 if present pattern
  if ("vehicle_1_ownership" in values || true) {
    values["vehicle_1_ownership"] = cell;
  }
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  console.log(
    JSON.stringify({
      sheetId: sheet.id,
      vehicle_ownership: values.vehicle_ownership,
      vehicle_1_ownership: values.vehicle_1_ownership,
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
