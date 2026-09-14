import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deals, quoteSheets, deskCustomFieldValues } from "../src/lib/db/schema";

const id = "9e9c9347-64ae-4c77-a76d-13a6a999df25";
const [deal] = await db.select().from(deals).where(eq(deals.id, id));
console.log("DEAL", {
  id: deal?.id,
  title: deal?.title,
  lineOfBusiness: deal?.lineOfBusiness,
  policySubType: deal?.policySubType,
  quotingForm: deal?.quotingForm,
  quotingLine: deal?.quotingLine,
  quotingUnlocked: deal?.quotingUnlocked,
  pipelineStage: deal?.pipelineStage,
  pipelineStageSlug: deal?.pipelineStageSlug,
});
const sheets = await db.select().from(quoteSheets).where(eq(quoteSheets.dealId, id));
console.log("SHEETS", sheets.map(s => ({
  id: s.id,
  line: s.line,
  sheet_product: s.values?.sheet_product,
  keys: Object.keys(s.values || {}).slice(0, 20),
  keyCount: Object.keys(s.values || {}).length,
})));
const vals = await db.select().from(deskCustomFieldValues).where(eq(deskCustomFieldValues.recordId, id));
const interesting = vals.filter(v => /insurance|quoting|life|type|subtype|pipeline/i.test(v.fieldKey));
console.log("CUSTOM", interesting.map(v => ({ key: v.fieldKey, value: v.value })));
process.exit(0);
