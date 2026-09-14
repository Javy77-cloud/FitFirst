import { eq, and, inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const DEALS = [
  "12aa92aa-3b8d-4211-acf3-fda09d77a194",
  "5ed997ba-21b5-4a70-bdf8-c78810cc79b1",
  "fa61a32c-5351-4c43-8f91-2f92ef83b123",
];
const EMP = "Office / Clerk";
const OCC = "Administrative"; // closest FL Auto occupation bucket
const cell = (value: string) => ({ value, source: "agent", status: "confirmed" });

async function main() {
  const sheets = await db.select().from(quoteSheets).where(inArray(quoteSheets.dealId, DEALS));
  for (const sheet of sheets) {
    const values = { ...(sheet.values as Record<string, unknown>) } as Record<string, any>;
    values.employment_status = cell(EMP);
    values.applicant_employment = cell(EMP);
    values.driver_1_employment = cell(EMP);
    values.employment = cell(EMP);
    // occupation: Auto may already have Employed — set Administrative for Progressive industry
    if (sheet.line === "auto" || !values.applicant_occupation?.value) {
      values.applicant_occupation = cell(OCC);
    }
    if (sheet.line === "auto") {
      values.driver_1_occupation = cell(OCC);
    }
    await db.update(quoteSheets).set({ values, updatedAt: new Date() }).where(eq(quoteSheets.id, sheet.id));
    console.log(sheet.line, EMP, OCC);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
