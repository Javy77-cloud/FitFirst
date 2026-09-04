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

export function defaultActivityTitle(kind: string): string {
  if (kind === "call") return "Call";
  if (kind === "meeting") return "Meeting";
  if (kind === "email") return "Email";
  if (kind === "sms") return "Text";
  return "Task";
}

export function activityLogBody(
  kind: string,
  eventType: string,
  title: string,
  extras?: { durationSeconds?: number | null; outcome?: string | null },
): string {
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
  let line =
    eventType === "created"
      ? `${noun} created: ${title}`
      : eventType === "completed"
        ? `${noun} completed: ${title}`
        : eventType === "cancelled"
          ? `${noun} cancelled: ${title}`
          : eventType === "logged"
            ? `${noun} logged: ${title}`
            : eventType === "sent"
              ? `${noun} sent: ${title}`
              : eventType === "received"
                ? `${noun} received: ${title}`
                : eventType === "bind"
                  ? title
                  : `${noun}: ${title}`;
  if (kind === "call") {
    const mins =
      extras?.durationSeconds != null
        ? Math.max(0, Math.round(extras.durationSeconds / 60))
        : null;
    const outcome = extras?.outcome?.replaceAll("_", " ");
    if (mins != null) line += ` · ${mins} min`;
    if (outcome) line += ` · ${outcome}`;
  }
  return line;
}
