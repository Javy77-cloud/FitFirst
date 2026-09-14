import { db } from "../src/lib/db";
import { deals, leads, contacts } from "../src/lib/db/schema";
import { or, ilike, eq } from "drizzle-orm";
import { loadRecordValues } from "../src/lib/custom-fields/store";

const dealHits = await db.select({
  id: deals.id,
  title: deals.title,
  primaryNamedInsured: deals.primaryNamedInsured,
  leadId: deals.leadId,
  contactId: deals.contactId,
  lineOfBusiness: deals.lineOfBusiness,
  pipelineStage: deals.pipelineStage,
  updatedAt: deals.updatedAt,
}).from(deals).where(or(
  ilike(deals.title, "%edmerson%"),
  ilike(deals.title, "%vasquez%"),
  ilike(deals.title, "%vazquez%"),
  ilike(deals.primaryNamedInsured, "%edmerson%"),
  ilike(deals.primaryNamedInsured, "%vasquez%"),
  ilike(deals.primaryNamedInsured, "%vazquez%"),
));
console.log("=== deals ===");
for (const d of dealHits) {
  console.log(JSON.stringify(d));
  const vals = await loadRecordValues(d.id).catch(() => ({} as Record<string, string>));
  console.log("  custom:", JSON.stringify({
    first_name: vals.first_name,
    last_name: vals.last_name,
    named_insured: vals.named_insured,
  }));
  if (d.leadId) {
    const [l] = await db.select({
      id: leads.id, firstName: leads.firstName, lastName: leads.lastName, status: leads.status,
    }).from(leads).where(eq(leads.id, d.leadId));
    console.log("  linked lead:", l ? JSON.stringify(l) : null);
  }
  if (d.contactId) {
    const [c] = await db.select({
      id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
    }).from(contacts).where(eq(contacts.id, d.contactId));
    console.log("  linked contact:", c ? JSON.stringify(c) : null);
  }
}

const leadHits = await db.select({
  id: leads.id, firstName: leads.firstName, lastName: leads.lastName, status: leads.status, email: leads.email,
}).from(leads).where(or(
  ilike(leads.firstName, "%edmerson%"),
  ilike(leads.lastName, "%vasquez%"),
  ilike(leads.lastName, "%vazquez%"),
));
console.log("=== leads by name ===");
console.log(JSON.stringify(leadHits, null, 2));
process.exit(0);
