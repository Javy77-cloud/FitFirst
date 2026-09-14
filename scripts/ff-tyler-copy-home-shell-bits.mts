import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const LIFE_ID = "1c6d07d2-7e1e-4ee5-9228-481a79c0b526";
const [life] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, LIFE_ID));
if (!life) throw new Error("life sheet missing");

const values = { ...life.values };
// Preserve shell bits that lived on the retired home row — not inventing life rating fields.
const patches: Record<string, string> = {
  applicant_name: "Tyler Bhattel",
  notes: "Phone 1-864-398-9859",
};
for (const [key, value] of Object.entries(patches)) {
  const current = String(values[key]?.value ?? "").trim();
  if (current) continue;
  values[key] = { value, status: "confirmed", source: "agent" };
}
values.sheet_product = { value: "life", status: "confirmed", source: "agent" };

await db
  .update(quoteSheets)
  .set({ values, updatedAt: new Date() })
  .where(eq(quoteSheets.id, LIFE_ID));

const [after] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, LIFE_ID));
console.log({
  line: after?.line,
  sheet_product: after?.values?.sheet_product,
  applicant_name: after?.values?.applicant_name,
  notes: after?.values?.notes,
  face_amount: after?.values?.face_amount,
});
process.exit(0);
