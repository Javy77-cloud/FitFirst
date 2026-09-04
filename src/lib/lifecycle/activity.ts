export type RelatedRecordIds = {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
};

/** A desk activity hangs on a Contact, Policy, Business, Deal, and/or Lead. */
export function hasRelatedRecord(related: RelatedRecordIds): boolean {
  return Boolean(
    related.contactId ||
      related.accountId ||
      related.policyId ||
      related.dealId ||
      related.leadId,
  );
}

export function assertRelatedRecord(related: RelatedRecordIds): RelatedRecordIds {
  if (!hasRelatedRecord(related)) {
    throw new Error(
      "Task, meeting, call, email, and SMS must assign to a Contact, Policy, Business, Deal, and/or Lead.",
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
            ? "SMS"
            : "Task";
  if (eventType === "created") return `${noun} created: ${title}`;
  if (eventType === "completed") return `${noun} completed: ${title}`;
  if (eventType === "cancelled") return `${noun} cancelled: ${title}`;
  if (eventType === "logged") return `${noun} logged: ${title}`;
  if (eventType === "bind") return title;
  return `${noun}: ${title}`;
}

export function defaultActivityTitle(kind: string): string {
  if (kind === "call") return "Logged call";
  if (kind === "meeting") return "Meeting";
  if (kind === "email") return "Email";
  if (kind === "sms") return "SMS";
  return "Task";
}
