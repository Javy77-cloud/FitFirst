export type RelatedRecordIds = {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
};

/** A task / meeting / call must hang on a Contact, Policy, and/or Business. */
export function hasRelatedRecord(related: RelatedRecordIds): boolean {
  return Boolean(related.contactId || related.accountId || related.policyId);
}

export function assertRelatedRecord(related: RelatedRecordIds): RelatedRecordIds {
  if (!hasRelatedRecord(related)) {
    throw new Error(
      "Task, meeting, and call must assign to a Contact, Policy, and/or Business.",
    );
  }
  return {
    contactId: related.contactId || null,
    accountId: related.accountId || null,
    policyId: related.policyId || null,
    dealId: related.dealId || null,
  };
}

export function activityLogBody(kind: string, eventType: string, title: string): string {
  const noun = kind === "call" ? "Call" : kind === "meeting" ? "Meeting" : "Task";
  if (eventType === "created") return `${noun} created: ${title}`;
  if (eventType === "completed") return `${noun} completed: ${title}`;
  if (eventType === "cancelled") return `${noun} cancelled: ${title}`;
  if (eventType === "logged") return `${noun} logged: ${title}`;
  if (eventType === "bind") return title;
  return `${noun}: ${title}`;
}
