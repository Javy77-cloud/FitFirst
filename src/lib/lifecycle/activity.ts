export type RelatedRecordIds = {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
};

/** A task / meeting / call must hang on a Contact, Policy, Business, or Lead. */
export function hasRelatedRecord(related: RelatedRecordIds): boolean {
  return Boolean(related.contactId || related.accountId || related.policyId || related.leadId);
}

/** Deal-row comms (call / email / sms) may hang on the Deal when no Contact is bound yet. */
export function hasCommsRecord(related: RelatedRecordIds): boolean {
  return hasRelatedRecord(related) || Boolean(related.dealId);
}

export function assertRelatedRecord(related: RelatedRecordIds): RelatedRecordIds {
  if (!hasRelatedRecord(related)) {
    throw new Error(
      "Task, meeting, and call must assign to a Contact, Policy, Business, and/or Lead.",
    );
  }
  return {
    contactId: related.contactId || null,
    accountId: related.accountId || null,
    policyId: related.policyId || null,
    dealId: related.dealId || null,
    leadId: related.leadId || null,
  };
}

export function activityLogBody(kind: string, eventType: string, title: string): string {
  const noun =
    kind === "call"
      ? "Call"
      : kind === "meeting"
        ? "Meeting"
        : kind === "email"
          ? "Email"
          : kind === "sms"
            ? "Text"
            : "Task";
  if (eventType === "created") return `${noun} created: ${title}`;
  if (eventType === "completed") return `${noun} completed: ${title}`;
  if (eventType === "cancelled") return `${noun} cancelled: ${title}`;
  if (eventType === "logged") return `${noun} logged: ${title}`;
  if (eventType === "sent") return `${noun} sent: ${title}`;
  if (eventType === "received") return `${noun} received: ${title}`;
  if (eventType === "bind") return title;
  return `${noun}: ${title}`;
}
