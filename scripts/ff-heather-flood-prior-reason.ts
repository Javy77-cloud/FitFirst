import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";

async function main() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  values.prior_flood_losses = {
    value: "no",
    status: "confirmed",
    source: "agent",
    updatedAt: new Date().toISOString(),
  };
  values.flood_quote_reason = {
    value: "Shopping / comparison",
    status: "confirmed",
    source: "agent",
    updatedAt: new Date().toISOString(),
  };
  await db.update(quoteSheets).set({ values, updatedAt: new Date() } as any).where(eq(quoteSheets.id, SHEET));
  console.log(JSON.stringify({ prior: values.prior_flood_losses, reason: values.flood_quote_reason }));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
