/**
 * Feel-pass: simulate Deal Details save for Edmerson→Gloria deals.
 * Calls applySystemDealValues with current custom first/last (as save would).
 */
import { db } from "../src/lib/db";
import { deals, leads } from "../src/lib/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { loadRecordValues } from "../src/lib/custom-fields/store";
import { applySystemDealValues } from "../src/app/actions/custom-fields";

const dealHits = await db
  .select({
    id: deals.id,
    title: deals.title,
    primaryNamedInsured: deals.primaryNamedInsured,
    leadId: deals.leadId,
    lineOfBusiness: deals.lineOfBusiness,
  })
  .from(deals)
  .where(
    or(
      ilike(deals.title, "%edmerson%"),
      ilike(deals.primaryNamedInsured, "%edmerson%"),
    ),
  );

console.log("=== before ===");
for (const d of dealHits) {
  const vals = await loadRecordValues(d.id);
  console.log(JSON.stringify({ ...d, customFirst: vals.first_name, customLast: vals.last_name }));
}

for (const d of dealHits) {
  const vals = await loadRecordValues(d.id);
  const system: Record<string, string> = {
    firstName: vals.first_name ?? "",
    lastName: vals.last_name ?? "",
    primaryNamedInsured: vals.named_insured ?? "",
  };
  await applySystemDealValues(d.id, system);
}

console.log("=== after ===");
for (const d of dealHits) {
  const [row] = await db
    .select({
      id: deals.id,
      title: deals.title,
      primaryNamedInsured: deals.primaryNamedInsured,
      leadId: deals.leadId,
      lineOfBusiness: deals.lineOfBusiness,
    })
    .from(deals)
    .where(eq(deals.id, d.id));
  const lead = row?.leadId
    ? (
        await db
          .select({ firstName: leads.firstName, lastName: leads.lastName, status: leads.status })
          .from(leads)
          .where(eq(leads.id, row.leadId))
      )[0]
    : null;
  console.log(
    JSON.stringify({
      ...row,
      leadStillLinked: Boolean(row?.leadId),
      leadName: lead ? `${lead.firstName} ${lead.lastName}` : null,
      leadStatus: lead?.status ?? null,
    }),
  );
}
process.exit(0);
