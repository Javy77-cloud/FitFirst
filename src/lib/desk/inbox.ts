/** Inbox / Envoys stubs. Work email connects later — no live mailbox. */

export type InboxStubKind = "email" | "sms" | "inbound_email";
export type InboxStubStatus = "queued" | "received";

export type InboxStub = {
  id: string;
  kind: InboxStubKind;
  from: string;
  subject: string;
  snippet: string;
  status: InboxStubStatus;
  occurredAt: string;
  href: string | null;
};

export function recordHrefForInbox(related: {
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}): string | null {
  if (related.contactId) return `/contacts/${related.contactId}`;
  if (related.accountId) return `/accounts/${related.accountId}`;
  if (related.policyId) return `/policies/${related.policyId}`;
  if (related.dealId) return `/deals/${related.dealId}`;
  if (related.leadId) return `/leads/${related.leadId}`;
  return null;
}

export function snippetOf(body: string | null | undefined, max = 160): string {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "No preview.";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function inboxStubFromActivity(row: {
  id: string;
  kind: string;
  fromAddress?: string | null;
  subject?: string | null;
  body?: string | null;
  occurredAt: Date | string;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
}): InboxStub {
  const kind = row.kind === "sms" ? "sms" : "email";
  const occurredAt = row.occurredAt instanceof Date ? row.occurredAt.toISOString() : row.occurredAt;
  return {
    id: row.id,
    kind,
    from: (row.fromAddress ?? "").trim() || "Unknown sender",
    subject: (row.subject ?? "").trim() || (kind === "sms" ? "Text received" : "Inbound email"),
    snippet: snippetOf(row.body),
    status: "received",
    occurredAt,
    href: recordHrefForInbox(row),
  };
}

export function inboxStubFromLeadOffer(row: {
  id: string;
  title: string;
  emailFrom?: string | null;
  emailSubject?: string | null;
  emailSnippet?: string | null;
  emailBody?: string | null;
  details?: string | null;
  leadId?: string | null;
  createdAt: Date | string;
}): InboxStub {
  const occurredAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt;
  return {
    id: row.id,
    kind: "inbound_email",
    from: (row.emailFrom ?? "").trim() || "Agency inbox",
    subject: (row.emailSubject ?? "").trim() || row.title,
    snippet: snippetOf(row.emailSnippet || row.emailBody || row.details),
    status: "queued",
    occurredAt,
    href: row.leadId ? `/leads/${row.leadId}` : "/",
  };
}

export function sortInboxStubs(rows: InboxStub[]): InboxStub[] {
  return [...rows].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function inboxWorkEmailConnected(accounts: { connected?: boolean; status?: string | null }[]): boolean {
  return accounts.some((row) => {
    if (row.connected) return true;
    const status = (row.status ?? "").toLowerCase();
    return status === "connected" || status === "connected_demo";
  });
}
