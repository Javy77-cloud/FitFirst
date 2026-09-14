import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";
const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const cell = (value: string) => ({ value, source: "agent", status: "confirmed" });
async function main() {
  const [sheet] = await db.select().from(quoteSheets).where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "auto")));
  if (!sheet) throw new Error("no auto sheet");
  const values = { ...(sheet.values as Record<string, unknown>), original_cost_new: cell("30000"), ocn: cell("30000") };
  await db.update(quoteSheets).set({ values, updatedAt: new Date() }).where(eq(quoteSheets.id, sheet.id));
  console.log("ok", (values as any).original_cost_new.value);
}
main().catch((e) => { console.error(e); process.exit(1); });
