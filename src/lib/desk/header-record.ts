/** Current record passed into the global header Call / SMS / Email / Task composers. */
export type HeaderRecordContext = {
  leadId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};
