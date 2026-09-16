import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, contacts, deals, leads } from "@/lib/db/schema";
import { lifeHealthShopRepair } from "./deal-products";
import { dealTitleForRecords } from "./deal-title";

let retitlePromise: Promise<number> | null = null;

/** One-shot First Last / Lob rename. Additive — does not wipe seed or coverage. */
export async function retitleExistingDeals(): Promise<number> {
  const rows = await db
    .select({
      deal: deals,
      contact: contacts,
      lead: leads,
      account: accounts,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .leftJoin(accounts, eq(deals.accountId, accounts.id))
    .where(eq(deals.tenantId, DEFAULT_TENANT_ID));

  let changed = 0;
  for (const row of rows) {
    const shopRepair = lifeHealthShopRepair({
      shopProducts: row.deal.shopProducts,
      shopLines: row.deal.shopLines,
      lineOfBusiness: row.deal.lineOfBusiness,
      quotingLine: row.deal.quotingLine,
      quotingForm: row.deal.quotingForm,
      policySubType: row.deal.policySubType,
    });
    const next = dealTitleForRecords({
      lineOfBusiness: row.deal.lineOfBusiness,
      primaryNamedInsured: row.deal.primaryNamedInsured,
      title: row.deal.title,
      contact: row.contact,
      lead: row.lead,
      account: row.account,
      quotingForm: row.deal.quotingForm,
      policySubType: row.deal.policySubType,
    });
    if ((!next || next === row.deal.title) && !shopRepair) continue;
    await db
      .update(deals)
      .set({
        ...(next && next !== row.deal.title ? { title: next } : {}),
        ...(shopRepair
          ? { shopLines: shopRepair.shopLines, shopProducts: shopRepair.shopProducts }
          : {}),
        updatedAt: row.deal.updatedAt ?? new Date(),
      })
      .where(eq(deals.id, row.deal.id));
    changed += 1;
  }
  return changed;
}

export async function ensureDealTitles(): Promise<number> {
  if (!retitlePromise) {
    retitlePromise = retitleExistingDeals().catch((error) => {
      retitlePromise = null;
      throw error;
    });
  }
  return retitlePromise;
}

export function resetDealTitleBoot() {
  retitlePromise = null;
}
