import type { HeatLevel } from "@/lib/desk/truth-strip";
import type { BookColumnId, BookHeat } from "./types";
import { renewalProximityDrivesCare } from "@/lib/renewal/handled";
import { businessDateKey, daysLeftEt } from "@/lib/policies/current-term";

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

/** "Reached 3d ago" / "Not reached" — the card and KPI words for a logged contact. */
export function reachCue(days: number | null): string {
  if (days == null) return "Not reached";
  return `Reached ${relativeTouchLabel(days)}`;
}

/** People / orgs: hot = needs a reach, not a shame board. */
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
  return daysLeftEt(iso, asOf);
}

const GLANCE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Short expiration for a card glance. Uses the term's calendar day, not UTC-shifted ET. */
export function glanceDate(iso: string | Date | null | undefined): string | null {
  const key = businessDateKey(iso);
  if (!key) return null;
  const [, month, day] = key.split("-");
  const year = key.slice(0, 4);
  return `${GLANCE_MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

function renewsIn(daysUntil: number, expirationLabel?: string | null): string {
  const when = expirationLabel?.trim();
  if (daysUntil < 0) return when ? `Expired ${when}` : "Past expiration";
  return when ? `Renews in ${daysUntil}d, ${when}` : `Renews in ${daysUntil}d`;
}

export function policyAttention(input: {
  daysUntil: number | null;
  lastTouchDays: number | null;
  /** Off-book / terminal (lapsed, cancelled, non_renewed, expired). Not renewal heat. */
  lapsed: boolean;
  openClaims: number;
  pendingEndorsements: number;
  missingDocs: number;
  expirationLabel?: string | null;
  /** Client staying / Handled — renewal proximity must not drive care. */
  renewalHandled?: boolean;
  /** Explicit status label when off-book (e.g. Lapsed / Cancelled). */
  offBookLabel?: string | null;
}): { heat: BookHeat; column: BookColumnId; why: string } {
  const offBook = input.lapsed;
  // Terminal status is not renewal heat. Client staying must not put it back in Current.
  const countRenewal = !offBook && renewalProximityDrivesCare(input.renewalHandled);
  // Status beats term dates, Renewal soon, and Client staying.
  // Open claims and waiting documents still belong in Needs care.
  if (offBook && input.openClaims === 0 && input.missingDocs === 0) {
    const label = input.offBookLabel?.trim() || "Off-book";
    return {
      heat: "cold",
      column: "lapsed",
      why: label,
    };
  }
  const reasons: string[] = [];
  if (input.openClaims > 0) {
    reasons.push(`${input.openClaims} open claim${input.openClaims === 1 ? "" : "s"}`);
  }
  if (input.missingDocs > 0) {
    reasons.push(`${input.missingDocs} doc${input.missingDocs === 1 ? "" : "s"} waiting`);
  }
  if (countRenewal && input.daysUntil != null && input.daysUntil < 30) {
    reasons.push(renewsIn(input.daysUntil, input.expirationLabel));
  }
  const now =
    input.openClaims > 0 ||
    input.missingDocs > 0 ||
    (countRenewal && input.daysUntil != null && input.daysUntil < 30);
  if (now) {
    return { heat: "hot", column: "now", why: reasons.slice(0, 2).join(" · ") || "Needs care now" };
  }

  if (input.pendingEndorsements > 0) {
    reasons.push(`${input.pendingEndorsements} endorsement draft${input.pendingEndorsements === 1 ? "" : "s"}`);
  }
  if (input.lastTouchDays == null || input.lastTouchDays >= 21) {
    reasons.push(input.lastTouchDays == null ? "Not reached" : `Silent ${relativeTouchLabel(input.lastTouchDays)}`);
  }
  if (countRenewal && input.daysUntil != null && input.daysUntil < 90) {
    reasons.push(renewsIn(input.daysUntil, input.expirationLabel));
  }
  const watch =
    input.pendingEndorsements > 0 ||
    (input.lastTouchDays == null || input.lastTouchDays >= 21) ||
    (countRenewal && input.daysUntil != null && input.daysUntil < 90);
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
