
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
  for (const i of [1, 2, 3]) {
    const rel = `household_${i}_relationship`;
    const st = `household_${i}_status`;
    const name = values[`household_${i}_name`]?.value;
    if (!name) continue;
    values[rel] = {
      value: "Excluded",
      source: "agent",
      status: "confirmed",
    };
    values[st] = {
      value: "Excluded driver",
      source: "agent",
      status: "confirmed",
    };
  }
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  const snap = [1, 2, 3].map((i) => ({
    name: values[`household_${i}_name`]?.value,
    rel: values[`household_${i}_relationship`]?.value,
    status: values[`household_${i}_status`]?.value,
  }));
  console.log(JSON.stringify(snap, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
