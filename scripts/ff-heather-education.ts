import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const HOME = "5ed997ba-21b5-4a70-bdf8-c78810cc79b1";
const FLOOD = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const VAL = "Bachelor's degree";
const cell = (value: string) => ({ value, source: "agent", status: "confirmed" });

async function setOn(dealId: string, line: string) {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, dealId), eq(quoteSheets.line, line)));
  if (!sheet) return { dealId, line, ok: false };
  const values = {
    ...(sheet.values as Record<string, unknown>),
    education_level: cell(VAL),
    applicant_education_level: cell(VAL),
    driver_1_education_level: cell(VAL),
  };
  await db.update(quoteSheets).set({ values, updatedAt: new Date() }).where(eq(quoteSheets.id, sheet.id));
  return { dealId, line, ok: true, sheetId: sheet.id };
}

async function main() {
  const out = [];
  out.push(await setOn(DEAL, "auto"));
  // personal — also Home + Flood if sheets exist
  out.push(await setOn(HOME, "home"));
  out.push(await setOn(FLOOD, "flood"));
  console.log(JSON.stringify(out, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
