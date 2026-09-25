/**
 * One-time client-name backfill for deals.title.
 * Dry run: npm run deals:retitle -- --dry-run
 * Apply:   npm run deals:retitle
 *
 * Does not run from the app. Skips a deal when no client name can be resolved.
 * Each write adds an eo_audit_logs row (action deal.title_updated).
 */
import { eq } from "drizzle-orm";
import { db, sql } from "../src/lib/db";
import { accounts, contacts, deals, eoAuditLogs, leads } from "../src/lib/db/schema";
import { buildDealTitle } from "../src/lib/deals/deal-title";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = await db
    .select({
      deal: deals,
      contact: contacts,
      account: accounts,
      lead: leads,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(accounts, eq(deals.accountId, accounts.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .where(eq(deals.tenantId, DEFAULT_TENANT_ID));

  let changed = 0;
  let skipped = 0;
  for (const row of rows) {
    const before = row.deal.title;
    const after = buildDealTitle({
      contact: row.contact,
      account: row.account,
      primaryNamedInsured: row.deal.primaryNamedInsured,
      lead: row.lead,
    });
    if (!after) {
      skipped += 1;
      console.log(`${row.deal.id}\tSKIP\t${before}`);
      continue;
    }
    if (after === before) continue;
    console.log(`${row.deal.id}\t${before}\t${after}`);
    changed += 1;
    if (dryRun) continue;
    await db.update(deals).set({ title: after }).where(eq(deals.id, row.deal.id));
    await db.insert(eoAuditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      actorName: "Owner request (Javy)",
      action: "deal.title_updated",
      summary: "Deal title updated",
      entityType: "deal",
      entityId: row.deal.id,
      dealId: row.deal.id,
      contactId: row.deal.contactId,
      accountId: row.deal.accountId,
      leadId: row.deal.leadId,
      meta: { before, after },
    });
  }
  console.log(`${dryRun ? "dry-run" : "updated"} ${changed}, skipped ${skipped} (no name)`);
  await sql.end({ timeout: 5 });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
