import { normalizeTaskPriority, urgencyFromTaskPriority, type TaskPriority } from "@/lib/time/et";
/** System-found attention cards for the Notification Panel. */

export const PANEL_SIGNAL_KINDS = [
  "quote_declined",
  "renewal_silence",
  "renewal_autopilot",
  "stale_docs",
  "commitment_nudge",
  "deal_cold_chase",
  "inbox_mail",
  "inbox_assigned",
  "renewal_term_started",
] as const;

export type PanelSignalKind = (typeof PANEL_SIGNAL_KINDS)[number];

export const PANEL_URGENCY = ["high", "medium", "low"] as const;
export type PanelUrgency = (typeof PANEL_URGENCY)[number];

export const PANEL_URGENCY_META: Record<
  PanelUrgency,
  { label: string; tone: "terracotta" | "amber" | "navy" }
> = {
  high: { label: "High", tone: "terracotta" },
  medium: { label: "Medium", tone: "amber" },
  low: { label: "Low", tone: "navy" },
};

export type PanelPrimaryAction = {
  id: string;
  label: string;
  href?: string;
  /** Server action name posted from the card. */
  action?: "retry_markets" | "send_renewal_reminder" | "confirm_chase" | "open_upload" | "open_entity";
};

export type PanelCard = {
  key: string;
  kind: PanelSignalKind;
  urgency: PanelUrgency;
  entityLine: string;
  why: string;
  primary: PanelPrimaryAction;
  href: string;
  entityType: string;
  entityId: string;
  deadline: Date | null;
  source: "live" | "stub";
  /** Existing alerts.id when persisted. */
  alertId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  quoteId?: string | null;
  remainingMarkets?: number;
  chaseBand?: "under30" | "30to60" | "60to90";
  escalated?: boolean;
  clientName?: string;
  daysUntil?: number;
  metaBody?: string;
};

export const PANEL_KIND_LABEL: Record<PanelSignalKind, string> = {
  quote_declined: "Quote declined overnight",
  renewal_silence: "Renewal silence",
  renewal_autopilot: "Renewal Autopilot",
  stale_docs: "Missing docs going stale",
  commitment_nudge: "Promise due",
  deal_cold_chase: "Deal went cold",
  inbox_mail: "Inbox needs you",
  inbox_assigned: "Mail assigned to you",
  renewal_term_started: "Term started today",
};

export const OVERNIGHT_HOURS = 18;
export const RENEWAL_SILENCE_MIN_DAYS = 38;
export const RENEWAL_SILENCE_MAX_DAYS = 52;
export const RENEWAL_SILENCE_GAP_DAYS = 7;
export const STALE_DOCS_GATHERING_DAYS = 3;
/**
 * Earliest automatic desk ping for an open promise.
 * About one hour before due — not a multi-day advance.
 */
export const COMMITMENT_DUE_SOON_HOURS = 1;

export function isPanelSignalKind(value: string | null | undefined): value is PanelSignalKind {
  return Boolean(value && PANEL_SIGNAL_KINDS.includes(value as PanelSignalKind));
}

export function panelUrgencyRank(urgency: PanelUrgency): number {
  if (urgency === "high") return 0;
  if (urgency === "medium") return 1;
  return 2;
}

export function sortPanelCards(cards: readonly PanelCard[]): PanelCard[] {
  return [...cards].sort((a, b) => {
    const urg = panelUrgencyRank(a.urgency) - panelUrgencyRank(b.urgency);
    if (urg !== 0) return urg;
    const aDue = a.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = b.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.entityLine.localeCompare(b.entityLine);
  });
}

export function groupPanelByUrgency(cards: readonly PanelCard[]): Record<PanelUrgency, PanelCard[]> {
  const groups: Record<PanelUrgency, PanelCard[]> = { high: [], medium: [], low: [] };
  for (const card of sortPanelCards(cards)) {
    groups[card.urgency].push(card);
  }
  return groups;
}

export function quoteDeclinedUrgency(remainingMarkets: number): PanelUrgency {
  return remainingMarkets <= 0 ? "high" : "medium";
}

export function quoteDeclinedWhy(input: {
  carrierName: string;
  declinedAt: Date;
  remainingMarkets: number;
}): string {
  const when = input.declinedAt.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const left =
    input.remainingMarkets <= 0
      ? "no carriers left"
      : `${input.remainingMarkets} carrier${input.remainingMarkets === 1 ? "" : "s"} left`;
  return `Declined by ${input.carrierName} at ${when} · ${left}`;
}

export function isOvernightDecline(createdAt: Date, asOf: Date, hours = OVERNIGHT_HOURS): boolean {
  return asOf.getTime() - createdAt.getTime() <= hours * 60 * 60 * 1000 && createdAt.getTime() <= asOf.getTime();
}

export function isRenewalSilenceWindow(daysUntil: number): boolean {
  return daysUntil >= RENEWAL_SILENCE_MIN_DAYS && daysUntil <= RENEWAL_SILENCE_MAX_DAYS;
}

export function isRenewalSilent(lastOutreachAt: Date | null, asOf: Date, gapDays = RENEWAL_SILENCE_GAP_DAYS): boolean {
  if (!lastOutreachAt) return true;
  return asOf.getTime() - lastOutreachAt.getTime() >= gapDays * 86_400_000;
}

export function renewalSilenceUrgency(daysUntil: number): PanelUrgency {
  if (daysUntil < 30) return "high";
  if (daysUntil <= RENEWAL_SILENCE_MAX_DAYS) return "medium";
  return "low";
}

export function renewalSilenceWhy(input: {
  daysUntil: number;
  lastOutreachAt: Date | null;
  asOf: Date;
}): string {
  const days = input.daysUntil;
  if (!input.lastOutreachAt) {
    return `${days} days to renewal · no outreach on file`;
  }
  const quiet = Math.max(
    0,
    Math.round((input.asOf.getTime() - input.lastOutreachAt.getTime()) / 86_400_000),
  );
  return `${days} days to renewal · no reply for ${quiet} day${quiet === 1 ? "" : "s"}`;
}

export function staleDocsUrgency(input: { expired: boolean; daysQuiet: number; daysToExpiry: number | null }): PanelUrgency {
  if (input.expired) return "high";
  if (input.daysToExpiry != null && input.daysToExpiry <= 7) return "high";
  if (input.daysQuiet >= 7) return "high";
  return "medium";
}

export function staleDocsWhy(input: {
  label: string;
  expired: boolean;
  daysQuiet: number;
  daysToExpiry: number | null;
}): string {
  if (input.expired && input.daysToExpiry != null) {
    return `${input.label} expired ${Math.abs(input.daysToExpiry)} day${Math.abs(input.daysToExpiry) === 1 ? "" : "s"} ago`;
  }
  if (input.daysToExpiry != null && input.daysToExpiry >= 0) {
    return `${input.label} expires in ${input.daysToExpiry} day${input.daysToExpiry === 1 ? "" : "s"}`;
  }
  return `${input.label} requested · ${input.daysQuiet} day${input.daysQuiet === 1 ? "" : "s"} without upload`;
}

function commitmentNudgeUrgencyFromDue(dueAt: Date, asOf: Date): PanelUrgency | null {
  const ms = dueAt.getTime() - asOf.getTime();
  if (ms < 0) return "high";
  if (ms <= COMMITMENT_DUE_SOON_HOURS * 60 * 60 * 1000) return "high";
  return null;
}

/**
 * Time-based urgency inside the remind window, then task priority.
 * Priority can raise or lower a ping that is already due. It must not
 * open one hours or days early.
 */
export function commitmentNudgeUrgency(
  dueAt: Date,
  asOf: Date,
  priorityRaw?: string | null,
): PanelUrgency | null {
  const timeBased = commitmentNudgeUrgencyFromDue(dueAt, asOf);
  if (timeBased == null) return null;
  const priority = normalizeTaskPriority(priorityRaw) as TaskPriority | null;
  return urgencyFromTaskPriority(priority, timeBased);
}

export function commitmentNudgeWhy(input: { title: string; dueAt: Date; asOf: Date }): string {
  const ms = input.dueAt.getTime() - input.asOf.getTime();
  if (ms < 0) {
    const hours = Math.max(1, Math.round(Math.abs(ms) / 3_600_000));
    if (hours < 24) return `${input.title} · overdue ${hours}h`;
    const days = Math.round(hours / 24);
    return `${input.title} · overdue ${days} day${days === 1 ? "" : "s"}`;
  }
  const hours = Math.max(1, Math.round(ms / 3_600_000));
  if (hours < 24) return `${input.title} · due in ${hours}h`;
  return `${input.title} · due in ${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? "" : "s"}`;
}

export function panelCardHref(card: Pick<PanelCard, "kind" | "dealId" | "policyId" | "href">): string {
  if (card.kind === "quote_declined" && card.dealId) return `/deals/${card.dealId}?tab=markets`;
  if (card.kind === "stale_docs" && card.dealId) return `/deals/${card.dealId}?tab=documents`;
  if (card.kind === "renewal_silence" && card.policyId) return `/policies/${card.policyId}`;
  if (card.kind === "deal_cold_chase" && card.dealId) return `/deals/${card.dealId}?tab=quotes`;
  if (card.kind === "renewal_autopilot") return "/renewals";
  if (card.kind === "renewal_term_started" && card.policyId) return `/policies/${card.policyId}/compare`;
  if (card.kind === "inbox_mail" || card.kind === "inbox_assigned") return card.href;
  return card.href;
}

export const PANEL_EMPTY_BOARD =
  "Nothing the system caught — keep shopping. Work chores and Inbox awareness land on their lanes.";

export const PANEL_EMPTY_WORK =
  "No Work items. Quiet renewals, declines, Autopilot, and stale docs land here.";

export const PANEL_EMPTY_INBOX =
  "Inbox is clear. Day-of term starts, matched agency mail, and assigned threads land here.";

export const PANEL_IN_APP_COPY =
  "System-found attention. One click advances the job. Nothing emails Javy or the agent.";
