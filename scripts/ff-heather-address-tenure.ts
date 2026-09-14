import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quoteSheets } from "../src/lib/db/schema";

/** Heather Auto — tenure_start 2025-09-03 → ~1 year at Tallwood (as of 2026-09-10). */
const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "auto")));
  if (!sheet) throw new Error("no auto sheet for Heather deal");
  const values = { ...(sheet.values as Record<string, any>) };
  values.years_at_address = {
    value: "1",
    source: "agent",
    status: "confirmed",
  };
  values.address_same_6_months = {
    value: "yes",
    source: "agent",
    status: "confirmed",
  };
  // prior_address left unset — same address 6+ months
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  console.log(
    JSON.stringify(
      {
        sheetId: sheet.id,
        years_at_address: values.years_at_address,
        address_same_6_months: values.address_same_6_months,
        prior_address: values.prior_address ?? null,
        ssn: values.ssn ?? values.applicant_ssn ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
