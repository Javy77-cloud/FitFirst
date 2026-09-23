import { resolvePartyEmail } from "@/lib/comms/resolve-party-email";

export type ComposeOpenPrefill = {
  email: string | null;
  name: string | null;
};

function personName(row?: { firstName?: string | null; lastName?: string | null } | null) {
  return `${row?.firstName ?? ""} ${row?.lastName ?? ""}`.trim();
}

/**
 * Build Open Compose To prefill from already-loaded party rows + deal CF.
 * Used by the server action and unit tests (deal-CF-only Catherine/Gloria cases).
 */
export function composeOpenPrefillFromParty(input: {
  contact?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  lead?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  account?: { email?: string | null; name?: string | null; dba?: string | null } | null;
  deal?: { title?: string | null; primaryNamedInsured?: string | null } | null;
  dealStored?: Record<string, string> | null;
}): ComposeOpenPrefill {
  const email = resolvePartyEmail({
    contact: input.contact,
    lead: input.lead,
    account: input.account,
    dealStored: input.dealStored,
  });
  const name =
    personName(input.contact) ||
    personName(input.lead) ||
    input.deal?.primaryNamedInsured?.trim() ||
    input.deal?.title?.trim() ||
    input.account?.name?.trim() ||
    input.account?.dba?.trim() ||
    null;
  return { email, name: name || null };
}

/** True when Open Compose has a CRM record to resolve (deal/contact/lead/account). Inbox blank = false. */
export function composeOpenHasRecordContext(related: {
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
}): boolean {
  return Boolean(related.dealId || related.leadId || related.contactId || related.accountId);
}
