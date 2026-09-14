import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const HOME_ID = "67a0a04e-4610-4736-ac58-3c6002224650";
const [home] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, HOME_ID));
if (!home) {
  console.log("home sheet already gone");
  process.exit(0);
}
const nonEmpty = Object.entries(home.values || {})
  .filter(([k, c]) => k !== "sheet_product" && String(c?.value ?? "").trim())
  .map(([k, c]) => [k, c?.value, c?.status, c?.source]);
console.log("nonEmpty count", nonEmpty.length, nonEmpty.slice(0, 30));

// Retire leftover home shell for this LIFE deal — Documents uses line=life now.
await db.delete(quoteSheets).where(eq(quoteSheets.id, HOME_ID));
console.log("DELETED home sheet", HOME_ID);
process.exit(0);
