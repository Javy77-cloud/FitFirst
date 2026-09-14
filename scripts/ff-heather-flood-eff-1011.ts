import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";

async function main() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  const now = new Date().toISOString();
  values.effective_date = { value: "10/11/2026", status: "confirmed", source: "agent", updatedAt: now };
  values.effective_date_type = { value: "New business", status: "confirmed", source: "agent", updatedAt: now };
  await db.update(quoteSheets).set({ values, updatedAt: new Date() } as any).where(eq(quoteSheets.id, SHEET));
  console.log(JSON.stringify({ effective_date: values.effective_date, effective_date_type: values.effective_date_type }));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
