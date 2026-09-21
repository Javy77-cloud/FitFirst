"use server";

import { listRecordActivities } from "@/lib/db/queries";

/** Activities for the optional list communication rail. */
export async function loadListComms(input: {
  leadId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
}) {
  return listRecordActivities({
    leadId: input.leadId || undefined,
    dealId: input.dealId || undefined,
    policyId: input.policyId || undefined,
    contactId: input.contactId || undefined,
    accountId: input.accountId || undefined,
  });
}
