import { and, eq } from "drizzle-orm";
import { contactPrefillForLayout } from "@/lib/crm/existing-contact-match";
import { copyDealDetailValues } from "@/lib/deals/create-from-source";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { loadRecordValues } from "@/lib/custom-fields/store";
import { db } from "@/lib/db";
import { contacts, deals } from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";

export type NewDealFormSeed = {
  contactId: string | null;
  sourceDealId: string | null;
  values: Record<string, string>;
};

async function loadContactPrefill(contactId: string): Promise<Record<string, string>> {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)));
  if (!contact) return {};
  return Object.fromEntries(
    Object.entries(contactPrefillForLayout(contact)).filter(([, value]) => Boolean(value)),
  );
}

/** Prefill /deals/new from a picked contact or source deal. Does not insert. */
export async function loadNewDealFormSeed(input: {
  contactId?: string | null;
  sourceDealId?: string | null;
}): Promise<NewDealFormSeed> {
  const sourceDealId = isUuid(input.sourceDealId) ? input.sourceDealId : null;
  let contactId = isUuid(input.contactId) ? input.contactId : null;
  const values: Record<string, string> = {};

  if (sourceDealId) {
    const [deal] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, sourceDealId)));
    if (deal) {
      if (!contactId && deal.contactId) contactId = deal.contactId;
      const custom = await loadRecordValues(deal.id, "deals").catch(() => ({} as Record<string, string>));
      Object.assign(values, copyDealDetailValues(custom));
    }
  }

  if (contactId) {
    const fromContact = await loadContactPrefill(contactId);
    // Copied deal details win; contact fills remaining blanks.
    for (const [key, value] of Object.entries(fromContact)) {
      if (!String(values[key] ?? "").trim()) values[key] = value;
    }
  }

  return { contactId, sourceDealId, values };
}
