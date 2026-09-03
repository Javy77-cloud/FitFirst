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

export function activityLogBody(
  kind: string,
  eventType: string,
  title: string,
  extras?: { durationSeconds?: number | null; outcome?: string | null },
): string {
  const noun = kind === "call" ? "Call" : kind === "meeting" ? "Meeting" : "Task";
  let line =
    eventType === "created"
      ? `${noun} created: ${title}`
      : eventType === "completed"
        ? `${noun} completed: ${title}`
        : eventType === "cancelled"
          ? `${noun} cancelled: ${title}`
          : eventType === "logged"
            ? `${noun} logged: ${title}`
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
