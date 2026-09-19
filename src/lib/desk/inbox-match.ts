import { parseEmailFrom } from "@/lib/home/lead-offers";
import { isClosedShoppingDeal } from "@/lib/deals/velocity";

export type InboxContactHit = {
  id: string;
  name: string;
  email: string;
};

export type InboxDealHit = {
  id: string;
  title: string;
  contactId: string | null;
  closed: boolean;
};

export type InboxRenewalHit = {
  policyId: string;
  contactId: string | null;
  clientName: string;
  daysUntil: number;
};

export type InboxMatchIndex = {
  agencyEmail: string | null;
  contacts: InboxContactHit[];
  deals: InboxDealHit[];
  renewals: InboxRenewalHit[];
};

export type InboxMatch = {
  emails: string[];
  contact: InboxContactHit | null;
  deal: InboxDealHit | null;
  renewal: InboxRenewalHit | null;
  unmatched: boolean;
};

export type InboxAttention = "needs_reply" | "unread" | "open_deal" | "rest";

export function normalizeInboxEmail(value: string | null | undefined): string | null {
  const parsed = parseEmailFrom(value);
  return parsed.email?.trim().toLowerCase() || null;
}

/** Pull every address out of a From/To/Cc header (comma-separated). */
export function emailsFromHeader(raw: string | null | undefined): string[] {
  const value = (raw ?? "").trim();
  if (!value) return [];
  const chunks = value.split(/\s*,\s*(?=(?:[^<]*<[^>]*>|[^,])+)/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const email = normalizeInboxEmail(chunk);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  if (out.length === 0) {
    const fallback = normalizeInboxEmail(value);
    if (fallback) out.push(fallback);
  }
  return out;
}

export function counterpartEmails(input: {
  from: string;
  to?: string | null;
  cc?: string | null;
  agencyEmail?: string | null;
}): string[] {
  const agency = input.agencyEmail?.trim().toLowerCase() || null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of [...emailsFromHeader(input.from), ...emailsFromHeader(input.to), ...emailsFromHeader(input.cc)]) {
    if (agency && email === agency) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function isAgencyAddress(header: string, agencyEmail: string | null | undefined): boolean {
  const agency = agencyEmail?.trim().toLowerCase();
  if (!agency) return false;
  return emailsFromHeader(header).includes(agency);
}

export function buildContactEmailIndex(contacts: InboxContactHit[]): Map<string, InboxContactHit> {
  const map = new Map<string, InboxContactHit>();
  for (const row of contacts) {
    const email = normalizeInboxEmail(row.email);
    if (!email || map.has(email)) continue;
    map.set(email, row);
  }
  return map;
}

export function openDealsForContact(deals: InboxDealHit[], contactId: string | null): InboxDealHit[] {
  if (!contactId) return [];
  return deals.filter((deal) => deal.contactId === contactId && !deal.closed);
}

/** One open deal only — never guess among two shops. */
export function unambiguousOpenDeal(deals: InboxDealHit[], contactId: string | null): InboxDealHit | null {
  const open = openDealsForContact(deals, contactId);
  return open.length === 1 ? open[0] ?? null : null;
}

export function nearestOpenRenewal(
  renewals: InboxRenewalHit[],
  contactId: string | null,
): InboxRenewalHit | null {
  if (!contactId) return null;
  const rows = renewals
    .filter((row) => row.contactId === contactId)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  return rows[0] ?? null;
}

export function matchInboxParty(
  addresses: string[],
  index: Pick<InboxMatchIndex, "contacts" | "deals" | "renewals">,
): InboxMatch {
  const byEmail = buildContactEmailIndex(index.contacts);
  let contact: InboxContactHit | null = null;
  for (const email of addresses) {
    const hit = byEmail.get(email);
    if (hit) {
      contact = hit;
      break;
    }
  }
  const deal = unambiguousOpenDeal(index.deals, contact?.id ?? null);
  const renewal = nearestOpenRenewal(index.renewals, contact?.id ?? null);
  return {
    emails: addresses,
    contact,
    deal,
    renewal,
    unmatched: !contact,
  };
}

export function inboxAttentionFor(input: {
  unread: boolean;
  inboundLast: boolean;
  dealId?: string | null;
}): InboxAttention {
  if (input.inboundLast) return "needs_reply";
  if (input.unread) return "unread";
  if (input.dealId) return "open_deal";
  return "rest";
}

export function inboxBandLabel(band: InboxAttention): string {
  if (band === "needs_reply") return "Needs reply";
  if (band === "unread") return "Unread";
  if (band === "open_deal") return "Open deal";
  return "Rest of inbox";
}

export function inboxBandRank(band: InboxAttention): number {
  if (band === "needs_reply") return 0;
  if (band === "unread") return 1;
  if (band === "open_deal") return 2;
  return 3;
}

/** After we chased a quote or renewal, don't nag about our own outbound sitting unread. */
export function shouldSilenceInboxSignal(input: {
  inboundLast: boolean;
  quoteChasedRecently: boolean;
  renewalChasedRecently: boolean;
}): boolean {
  if (input.inboundLast) return false;
  return input.quoteChasedRecently || input.renewalChasedRecently;
}

export function inboxMailWhy(input: {
  subject: string;
  from: string;
  inboundLast: boolean;
  unread: boolean;
  contactName?: string | null;
  dealTitle?: string | null;
  renewalName?: string | null;
}): string {
  const who = input.contactName || input.from;
  const about = input.dealTitle || input.renewalName || input.subject;
  if (input.inboundLast) return `${who} wrote · ${about}`;
  if (input.unread) return `Unread from ${who} · ${about}`;
  return `${who} · ${about}`;
}

export function inboxThreadHref(threadId: string): string {
  return `/inbox?thread=${encodeURIComponent(threadId)}`;
}

export function contactCreateHref(email: string, name?: string | null): string {
  const params = new URLSearchParams();
  params.set("new", "1");
  if (email) params.set("email", email);
  if (name?.trim()) params.set("name", name.trim());
  return `/contacts?${params.toString()}`;
}

export function dealClosedForInbox(row: {
  boundAt?: Date | string | null;
  archivedAt?: Date | string | null;
  pipelineStage?: string | null;
  pipelineStageSlug?: string | null;
}): boolean {
  return isClosedShoppingDeal(row);
}

export const INBOX_CHASE_SILENCE_MS = 2 * 24 * 60 * 60 * 1000;

export function chasedRecently(at: Date | string | null | undefined, asOf: Date): boolean {
  if (!at) return false;
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) return false;
  const delta = asOf.getTime() - date.getTime();
  return delta >= 0 && delta <= INBOX_CHASE_SILENCE_MS;
}
