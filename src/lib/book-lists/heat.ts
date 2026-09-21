import type { HeatLevel } from "@/lib/desk/truth-strip";
import type { BookColumnId, BookHeat } from "./types";

export function daysSinceTouch(iso: string | Date | null | undefined, asOf: Date): number | null {
  if (!iso) return null;
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((asOf.getTime() - date.getTime()) / 86_400_000));
}

export function relativeTouchLabel(days: number | null): string {
  if (days == null) return "Never";
  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  if (days < 540) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** People / orgs: hot = needs a touch, not a shame board. */
export function partyAttentionHeat(input: {
  lastTouchDays: number | null;
  healthBand?: "high" | "medium" | "low" | null;
  inForce: number;
  openDeals: number;
}): BookHeat {
  if (input.healthBand === "high") return "hot";
  const days = input.lastTouchDays;
  if (days == null) return input.inForce > 0 || input.openDeals > 0 ? "hot" : "cooling";
  if (days >= 90) return "hot";
  if (days >= 45 && input.inForce > 0) return "hot";
  if (days >= 21 || input.healthBand === "medium" || input.openDeals > 0) return "cooling";
  return "cold";
}

export function partyColumnForHeat(heat: BookHeat): BookColumnId {
  if (heat === "hot") return "touch";
  if (heat === "cooling") return "watch";
  return "current";
}

export function carrierMarketHeat(input: {
  rateable: boolean | null;
  skipDecline: boolean;
  inactive: boolean;
  limited: boolean;
}): BookHeat {
  if (input.inactive || input.skipDecline || input.rateable === false) return "cold";
  if (input.limited || input.rateable == null) return "cooling";
  return "hot";
}

export function carrierColumnFor(input: {
  heat: BookHeat;
  skipDecline: boolean;
  rateable: boolean | null;
}): BookColumnId {
  if (input.skipDecline || input.heat === "cold" || input.rateable === false) return "skip";
  if (input.heat === "cooling" || input.rateable == null) return "limited";
  return "rateable";
}

export function heatFromLevels(levels: BookHeat[]): Record<HeatLevel, number> {
  const counts: Record<HeatLevel, number> = { hot: 0, cooling: 0, cold: 0 };
  for (const level of levels) counts[level] += 1;
  return counts;
}

export function daysUntilDate(iso: string | Date | null | undefined, asOf: Date): number | null {
  if (!iso) return null;
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - asOf.getTime()) / 86_400_000);
}

const GLANCE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Short expiration for a card glance. UTC so a date-only term does not slip a day. */
export function glanceDate(iso: string | Date | null | undefined): string | null {
  if (!iso) return null;
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${GLANCE_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function renewsIn(daysUntil: number, expirationLabel?: string | null): string {
  const when = expirationLabel?.trim();
  if (daysUntil < 0) return when ? `Expired ${when}` : "Past expiration";
  return when ? `Renews in ${daysUntil}d, ${when}` : `Renews in ${daysUntil}d`;
}

export function policyAttention(input: {
  daysUntil: number | null;
  lastTouchDays: number | null;
  lapsed: boolean;
  openClaims: number;
  pendingEndorsements: number;
  missingDocs: number;
  expirationLabel?: string | null;
}): { heat: BookHeat; column: BookColumnId; why: string } {
  const reasons: string[] = [];
  if (input.lapsed) reasons.push("Lapsed or cancelled");
  if (input.daysUntil != null && input.daysUntil < 30) {
    reasons.push(renewsIn(input.daysUntil, input.expirationLabel));
  }
  if (input.openClaims > 0) {
    reasons.push(`${input.openClaims} open claim${input.openClaims === 1 ? "" : "s"}`);
  }
  if (input.missingDocs > 0) {
    reasons.push(`${input.missingDocs} doc${input.missingDocs === 1 ? "" : "s"} waiting`);
  }
  const now =
    input.lapsed ||
    (input.daysUntil != null && input.daysUntil < 30) ||
    input.openClaims > 0 ||
    input.missingDocs > 0;
  if (now) {
    return { heat: "hot", column: "now", why: reasons.slice(0, 2).join(" · ") || "Needs care now" };
  }

  if (input.pendingEndorsements > 0) {
    reasons.push(`${input.pendingEndorsements} endorsement draft${input.pendingEndorsements === 1 ? "" : "s"}`);
  }
  if (input.lastTouchDays == null || input.lastTouchDays >= 21) {
    reasons.push(input.lastTouchDays == null ? "No logged touch" : `Silent ${relativeTouchLabel(input.lastTouchDays)}`);
  }
  if (input.daysUntil != null && input.daysUntil < 90) {
    reasons.push(renewsIn(input.daysUntil, input.expirationLabel));
  }
  const watch =
    input.pendingEndorsements > 0 ||
    (input.lastTouchDays == null || input.lastTouchDays >= 21) ||
    (input.daysUntil != null && input.daysUntil < 90);
  if (watch) {
    return {
      heat: "cooling",
      column: "watch",
      why: reasons.slice(0, 2).join(" · ") || "Watch this term",
    };
  }
  return {
    heat: "cold",
    column: "current",
    why: input.daysUntil != null ? renewsIn(input.daysUntil, input.expirationLabel) : "Current — no open needs",
  };
}

export function sortCommandStack<T extends { heat: BookHeat; lastTouchDays: number | null }>(cards: T[]): T[] {
  const rank: Record<BookHeat, number> = { hot: 0, cooling: 1, cold: 2 };
  return [...cards].sort((left, right) => {
    if (rank[left.heat] !== rank[right.heat]) return rank[left.heat] - rank[right.heat];
    return (right.lastTouchDays ?? 9_999) - (left.lastTouchDays ?? 9_999);
  });
}
