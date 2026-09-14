/**
 * Fix Gloria DP3 contamination + re-Fill master sheet (Deal → Property → Docs).
 * Does NOT start Markets. Does NOT touch list column prefs.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";
import { runFillQuoteSheet } from "../src/app/actions/quote-sheet";
import type { QuoteSheetFieldValue } from "../src/lib/db/schema";

const DP3 = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";

function cell(value: string, source: QuoteSheetFieldValue["source"] = "extracted"): QuoteSheetFieldValue {
  return { value, status: "check", source, sourceLabel: source === "extracted" ? "dec page" : "deal details" };
}

async function main() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DP3), eq(quoteSheets.line, "home")));
  if (!sheet) throw new Error("no sheet");
  const values: Record<string, QuoteSheetFieldValue> = { ...(sheet.values as any) };

  // Undo Edmerson contamination — docs + deal say Gloria Martinez
  const gloriaFixes: Record<string, QuoteSheetFieldValue> = {
    named_insured: cell("Gloria Martinez", "agent"),
    applicant_name: cell("Gloria Martinez", "agent"),
    current_policy_named_insured: cell("GLORIA MARTINEZ", "extracted"),
  };
  // Clear wrong email/phone notes that came from sibling create — leave blank for layout→Fill
  // Only clear if clearly Edmerson
  if (String(values.applicant_email?.value ?? "").toLowerCase().includes("edmerson")) {
    values.applicant_email = { value: "", status: "missing", source: "blank" };
  }
  if (String(values.notes?.value ?? "").toLowerCase().includes("edmerson")) {
    values.notes = { value: "", status: "missing", source: "blank" };
  }
  if (String(values.named_insured?.value ?? "").toLowerCase().includes("edmerson")) {
    values.named_insured = gloriaFixes.named_insured;
  }
  if (String(values.applicant_name?.value ?? "").toLowerCase().includes("edmerson") ||
      !String(values.applicant_name?.value ?? "").trim()) {
    values.applicant_name = gloriaFixes.applicant_name;
  }
  // Force Gloria named insured even if agent-confirmed Edmerson
  values.named_insured = gloriaFixes.named_insured;
  values.current_policy_named_insured = gloriaFixes.current_policy_named_insured;

  // Seed blank yellows that are explicit on Southern Oak DP-3 dec (never invent)
  const fromDec: Record<string, string> = {
    form: "DP3",
    construction: "Masonry",
    opening_protection: "N",
    sprinkler: "no",
    central_alarm: "no",
    building_code: "04",
    loss_of_rents: "30900",
    landlord_liability: "100000",
    mobile_home: "no",
  };
  for (const [k, v] of Object.entries(fromDec)) {
    const cur = values[k];
    if (!cur || !String(cur.value ?? "").trim() || cur.status === "missing") {
      values[k] = cell(v);
    }
  }

  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  console.log("seeded dec yellows + gloria NI");

  console.log("running Fill…");
  const result = await runFillQuoteSheet(DP3, "home");
  console.log("fill result", JSON.stringify(result, null, 2).slice(0, 3000));

  const [after] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DP3), eq(quoteSheets.line, "home")));
  const v = (after?.values ?? {}) as Record<string, QuoteSheetFieldValue>;
  const entries = Object.entries(v);
  const filled = entries.filter(([, c]) => c && String(c.value ?? "").trim() && c.status !== "missing");
  const yellow = entries.filter(([, c]) => !c || !String(c.value ?? "").trim() || c.status === "missing");
  console.log("filled", filled.length, "yellow", yellow.length, "total", entries.length);
  console.log("YELLOW KEYS:", yellow.map(([k]) => k).sort().join(", "));
  for (const k of [
    "named_insured","form","construction","opening_protection","sprinkler","central_alarm",
    "building_code","loss_of_rents","landlord_liability","applicant_gender","applicant_occupation",
    "applicant_employment","applicant_marital_status","applicant_education_level","entity_type",
    "mobile_home","deadbolts","animals","lease_term","tenant_name"
  ]) {
    const c = v[k];
    console.log(`  ${k} = ${JSON.stringify(c?.value ?? "")} src=${c?.source} status=${c?.status}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
