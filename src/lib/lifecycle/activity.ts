export type RelatedRecordIds = {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
};

/** A task / meeting / call must hang on a Contact, Policy, Business, Lead, and/or Deal. */
export function hasRelatedRecord(related: RelatedRecordIds): boolean {
  return Boolean(
    related.contactId || related.accountId || related.policyId || related.leadId || related.dealId,
  );
}

/** Call / email / sms — same link set as tasks (Deal alone is enough). */
export function hasCommsRecord(related: RelatedRecordIds): boolean {
  return hasRelatedRecord(related);
}

export function assertRelatedRecord(related: RelatedRecordIds): RelatedRecordIds {
  if (!hasRelatedRecord(related)) {
    throw new Error(
      "Task, meeting, and call must assign to a Deal, Contact, Policy, Business, and/or Lead.",
    );
  }
  return normalizeRelated(related);
}

/** Call / email / SMS may hang on Deal alone (Quick Comms on a deal with no Contact yet). */
export function assertCommsRecord(related: RelatedRecordIds): RelatedRecordIds {
  if (!hasCommsRecord(related)) {
    throw new Error("Call, email, and text need a Deal, Contact, Policy, Business, or Lead.");
  }
  return normalizeRelated(related);
}

function normalizeRelated(related: RelatedRecordIds): RelatedRecordIds {
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

/**
 * Timeline / activity_logs for call, SMS, and email only after the action
 * finishes. Opening a composer, a draft, or a cancel is not a log.
 */
export function shouldWriteCommsActivityLog(input: {
  kind: string;
  eventType?: string | null;
  status?: string | null;
  outcome?: string | null;
}): boolean {
  const kind = input.kind;
  if (kind !== "call" && kind !== "email" && kind !== "sms") return true;

  const eventType = (input.eventType ?? "").trim();
  const status = (input.status ?? "").trim();
  const outcome = (input.outcome ?? "").trim();

  if (
    eventType === "opened" ||
    eventType === "draft" ||
    eventType === "cancelled" ||
    eventType === "canceled"
  ) {
    return false;
  }
  if (status === "cancelled" || status === "canceled") return false;

  if (kind === "call") {
    return (eventType === "completed" || eventType === "logged") && Boolean(outcome);
  }

  return (
    eventType === "sent" ||
    eventType === "received" ||
    eventType === "queued" ||
    eventType === "completed"
  );
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
