/** Notification Panel chase when a shopping deal hits the 14-day no-comms cold rule. */

import { planEpisodeSync } from "@/lib/alerts/episode";

export const DEAL_COLD_CHASE_KIND = "deal_cold_chase";
export const DEAL_COLD_CHASE_TITLE = "Deal went cold — one-click chase";

export type ColdChaseCard = {
  id: string;
  heat: string;
  closed: boolean;
  insured: string;
  title: string;
  ownerId: string | null;
  /** Soft-parked — never cold-chase while On hold. */
  onHold?: boolean;
};

export type ColdChaseNotice = {
  dealId: string;
  ownerId: string | null;
  title: string;
  body: string;
  href: string;
};

export function isDealColdChaseKind(kind: string | null | undefined): boolean {
  return kind === DEAL_COLD_CHASE_KIND;
}

export function coldChaseHref(dealId: string): string {
  return `/deals/${dealId}?tab=quotes`;
}

export function coldChaseOpenLabel(kind?: string | null): string {
  if (isDealColdChaseKind(kind)) return "Chase";
  if (kind === "quote_declined") return "Retry carriers";
  if (kind === "renewal_silence") return "Send reminder";
  if (kind === "stale_docs") return "Open upload";
  if (kind === "lead_follow_up") return "Open lead";
  return "Open";
}

export function planColdChaseNotices(cards: readonly ColdChaseCard[]): ColdChaseNotice[] {
  return cards
    .filter((card) => !card.closed && !card.onHold && card.heat === "cold")
    .map((card) => {
      const name = card.insured !== "—" && card.insured.trim() ? card.insured : card.title;
      return {
        dealId: card.id,
        ownerId: card.ownerId,
        title: DEAL_COLD_CHASE_TITLE,
        body: `${name} · 14 days with no platform-logged comms.`,
        href: coldChaseHref(card.id),
      };
    });
}

export type ColdChaseAlertRow = {
  id: string;
  entityId: string | null;
  readAt: Date | null;
};

export type ColdChaseSyncPlan = {
  /** Deals that still need a first unread chase this cold episode. */
  insertDealIds: string[];
  /** Alert ids to drop because the deal left cold (episode ended → re-eligible later). */
  endEpisodeAlertIds: string[];
};

/**
 * One chase per cold episode per deal.
 * - While still cold: any prior alert (read or unread) suppresses a new insert.
 * - When no longer cold: drop prior alerts so a later cold episode can notify again.
 */
export function planColdChaseSync(
  planned: readonly ColdChaseNotice[],
  existing: readonly ColdChaseAlertRow[],
): ColdChaseSyncPlan {
  const liveKeys = planned.map((notice) => notice.dealId);
  const episodes = existing
    .filter((row) => row.entityId)
    .map((row) => ({ id: row.id, key: row.entityId as string }));
  const plan = planEpisodeSync(liveKeys, episodes);
  return { insertDealIds: plan.insertKeys, endEpisodeAlertIds: plan.endEpisodeAlertIds };
}
