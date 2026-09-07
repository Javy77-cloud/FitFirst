export function mergeDealSystemValues(
  deal: {
    primaryNamedInsured?: string | null;
    notes?: string | null;
    state?: string | null;
  },
  lead:
    | {
        firstName?: string | null;
        middleName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
        dateOfBirth?: string | null;
        mailingAddress?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
        notes?: string | null;
      }
    | null
    | undefined,
  stored: Record<string, string>,
): Record<string, string> {
  const fromLead: Record<string, string> = {
    first_name: lead?.firstName ?? "",
    middle_name: lead?.middleName ?? "",
    last_name: lead?.lastName ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    date_of_birth: lead?.dateOfBirth ?? "",
    mailing_address: lead?.mailingAddress ?? "",
    city: lead?.city ?? "",
    state: lead?.state ?? deal.state ?? "",
    zip: lead?.zip ?? "",
    notes: stored.notes || deal.notes || lead?.notes || "",
    named_insured: stored.named_insured || deal.primaryNamedInsured || "",
  };
  return { ...fromLead, ...stored };
}
