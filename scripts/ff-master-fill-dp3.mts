import { runFillFromDealDetails, runFillFromPropertyRecords, runFillQuoteSheet } from "../src/app/actions/quote-sheet";
import { db } from "../src/lib/db";
import { and, eq } from "drizzle-orm";
import { quoteSheets } from "../src/lib/db/schema";
import { applyMasterSheetDefaults, emptyDefaultsForLine } from "../src/lib/quote-sheet/sheet-defaults";
import { loadRecordValues } from "../src/lib/custom-fields/store";
import { fillSheetFromDealDetails } from "../src/lib/quote-sheet/fill-from-deal";
import { sql } from "drizzle-orm";

const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const HO3 = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

async function dump(id: string, label: string) {
  const rows = await db.execute(sql`select values from quote_sheets where deal_id=${id} and line='home'`);
  const v = (rows as any[])[0]?.values || {};
  const entries = Object.entries(v) as any[];
  const filled = entries.filter(([,c])=>c && String(c.value||"").trim() && c.status!=="missing");
  const yellow = entries.filter(([,c])=>!c || !String(c.value||"").trim() || c.status==="missing");
  console.log(label, "filled", filled.length, "yellow", yellow.length, "pct", Math.round(100*filled.length/Math.max(entries.length,1)));
  console.log(label, "YELLOW:", yellow.map(([k])=>k).sort().join(", "));
  for (const k of ["form","construction","applicant_gender","applicant_occupation","applicant_employment","applicant_marital_status","applicant_education_level","entity_type","deadbolts","animals","smoke_detectors","pool","named_insured","lease_term","landlord_liability","loss_of_rents"]) {
    const c = v[k];
    console.log(`  ${k}=${JSON.stringify(c?.value??"")} src=${c?.source} status=${c?.status}`);
  }
}

async function main() {
  const stored = await loadRecordValues(DP3, "deals");
  console.log("stored", {
    gender: stored.applicant_gender,
    occ: stored.applicant_occupation,
    subtype: stored.insurance_subtype,
    email: stored.email,
  });

  // Local deal-fill + defaults (avoid revalidatePath)
  const [sheet] = await db.select().from(quoteSheets).where(and(eq(quoteSheets.dealId, DP3), eq(quoteSheets.line, "home")));
  const dealRows = await db.execute(sql`select * from deals where id=${DP3}`);
  const deal = (dealRows as any[])[0];
  const riskRows = await db.execute(sql`select * from risks where deal_id=${DP3}`);
  const risk = (riskRows as any[])[0];

  let values = { ...(sheet.values as any) };
  const applied = fillSheetFromDealDetails(
    {
      primaryNamedInsured: deal.primary_named_insured,
      secondaryNamedInsured: deal.secondary_named_insured,
      propertyOneliner: deal.property_oneliner,
      currentCarrier: deal.current_carrier,
      coverageAmount: deal.coverage_amount,
      quotingForm: deal.quoting_form,
      policySubType: deal.policy_sub_type,
      stored,
      risk: risk
        ? { address1: risk.address1, city: risk.city, county: risk.county, state: risk.state, zip: risk.zip }
        : null,
    },
    values,
  );
  console.log("deal fill keys", applied.filledKeys);
  console.log("deal skipped", applied.skippedKeys.slice(0, 30));
  values = applied.values;
  const defs = applyMasterSheetDefaults(values, emptyDefaultsForLine("home"));
  console.log("defaults filled", defs.filledKeys);
  values = defs.values;

  await db.update(quoteSheets).set({ values, updatedAt: new Date() }).where(eq(quoteSheets.id, sheet.id));

  const prop = await runFillFromPropertyRecords(DP3, "home");
  console.log("property", prop.status, prop.filledKeys?.length, prop.message);

  // docs already filled recently — skip long Gemini unless needed
  console.log("\n--- AFTER deal+defaults+property ---");
  await dump(DP3, "DP3");
  await dump(HO3, "HO3");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
