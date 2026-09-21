import type { GmailThreadPreview } from "@/lib/integrations/gmail";
import {
  counterpartEmails,
  inboxAttentionFor,
  inboxBandRank,
  inboxMailWhy,
  inboxThreadHref,
  matchInboxParty,
  type InboxAttention,
  type InboxMatch,
  type InboxMatchIndex,
} from "@/lib/desk/inbox-match";

export type InboxDeskThread = {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  unread: boolean;
  inboundLast: boolean;
  messageCount: number;
  lastMessageId: string;
  lastInternalDate: number;
  messageIdHeader: string;
  references: string;
  attention: InboxAttention;
  match: InboxMatch;
  why: string;
  href: string;
};

export const INBOX_BANDS: InboxAttention[] = ["unread", "read"];

export function presentInboxThread(row: GmailThreadPreview, index: InboxMatchIndex): InboxDeskThread {
  const emails = counterpartEmails({
    from: row.from,
    to: row.to,
    agencyEmail: index.agencyEmail,
  });
  const match = matchInboxParty(emails, index);
  const attention = inboxAttentionFor({
    unread: row.unread,
    inboundLast: row.inboundLast,
    dealId: match.deal?.id,
  });
  return {
    ...row,
    attention,
    match,
    why: inboxMailWhy({
      subject: row.subject,
      from: row.from,
      inboundLast: row.inboundLast,
      unread: row.unread,
      contactName: match.contact?.name,
      dealTitle: match.deal?.title,
      renewalName: match.renewal ? `${match.renewal.clientName} renewal` : null,
    }),
    href: inboxThreadHref(row.id),
  };
}

/** Newest mail first. Gmail internal time wins; a missing stamp falls back to the Date header. */
export function inboxThreadRecency(row: Pick<InboxDeskThread, "lastInternalDate" | "date">): number {
  if (Number.isFinite(row.lastInternalDate) && row.lastInternalDate > 0) return row.lastInternalDate;
  const parsed = Date.parse(row.date);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function groupInboxThreads(rows: InboxDeskThread[]): Record<InboxAttention, InboxDeskThread[]> {
  const groups: Record<InboxAttention, InboxDeskThread[]> = {
    unread: [],
    read: [],
  };
  const sorted = [...rows].sort((a, b) => {
    const band = inboxBandRank(a.attention) - inboxBandRank(b.attention);
    if (band !== 0) return band;
    return inboxThreadRecency(b) - inboxThreadRecency(a);
  });
  for (const row of sorted) {
    groups[row.attention].push(row);
  }
  return groups;
}

export function flattenInboxBands(rows: InboxDeskThread[]): InboxDeskThread[] {
  const groups = groupInboxThreads(rows);
  return INBOX_BANDS.flatMap((band) => groups[band]);
}

export type InboxCue = {
  contactId: string | null;
  dealId: string | null;
  policyId: string | null;
  why: string;
  href: string;
};

export function inboxCuesFromThreads(rows: InboxDeskThread[]): InboxCue[] {
  const cues: InboxCue[] = [];
  for (const row of rows) {
    if (!row.inboundLast && !row.unread) continue;
    if (!row.match.contact && !row.match.deal && !row.match.renewal) continue;
    cues.push({
      contactId: row.match.contact?.id ?? null,
      dealId: row.match.deal?.id ?? null,
      policyId: row.match.renewal?.policyId ?? null,
      why: row.inboundLast ? `Mail · ${row.subject}` : `Unread · ${row.subject}`,
      href: row.href,
    });
  }
  return cues;
}

export function cueForContact(cues: InboxCue[], contactId: string | null | undefined): InboxCue | null {
  if (!contactId) return null;
  return cues.find((row) => row.contactId === contactId) ?? null;
}

export function cueForDeal(cues: InboxCue[], dealId: string | null | undefined): InboxCue | null {
  if (!dealId) return null;
  return cues.find((row) => row.dealId === dealId) ?? null;
}

export function cueForPolicy(cues: InboxCue[], policyId: string | null | undefined): InboxCue | null {
  if (!policyId) return null;
  return cues.find((row) => row.policyId === policyId) ?? null;
}
