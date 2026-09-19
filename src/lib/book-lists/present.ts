import { contactHealthScore } from "@/lib/contacts/health-score";
import type { HealthChipView } from "@/lib/health/model";
import { haystack } from "@/lib/search/live-query";
import type { BookGlanceCard, BookHeat } from "./types";
import {
  carrierColumnFor,
  carrierMarketHeat,
  daysSinceTouch,
  daysUntilDate,
  partyAttentionHeat,
  partyColumnForHeat,
  policyAttention,
  relativeTouchLabel,
} from "./heat";

export type PartyListRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  legalName?: string | null;
  dba?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  industry?: string | null;
  source?: string | null;
  clientStatus?: string | null;
  tags?: string[] | null;
  policyCount: number;
  activePolicyCount: number;
  lifetimeDealCount?: number;
  lastActivityAt?: Date | string | null;
};

export type OpenDealSignal = {
  count: number;
  dealId: string | null;
};

export type CarrierListRow = {
  id: string;
  name: string;
  agencyCode?: string | null;
  active?: boolean | null;
  deskStatus?: string | null;
  writtenLines?: string[] | null;
  appetiteNotes?: string | null;
  dontWriteNotes?: string | null;
  tags?: string[] | null;
  lastContactedAt?: Date | string | null;
};

export type CarrierMarketSignal = {
  rateable: boolean | null;
  skipDecline: boolean;
  skipWhy: string | null;
  limited: boolean;
  appetiteLines: string[];
  dontWrite: string[];
  lastUseAt: Date | null;
  lastUseKind: "quote" | "issued" | "contact" | null;
  declineCount: number;
  skipCount: number;
  activePolicies: number;
};

function partyTitle(row: PartyListRow, kind: "contact" | "account"): string {
  if (kind === "account") return row.name?.trim() || "Untitled account";
  const last = row.lastName?.trim() || "";
  const first = row.firstName?.trim() || "";
  return [last, first].filter(Boolean).join(", ") || "Untitled contact";
}

function primaryPartyAction(input: {
  heat: BookHeat;
  phone?: string | null;
  openDealId: string | null;
  href: string;
}): { label: string; href: string } {
  if (input.heat === "hot" && input.phone?.trim()) {
    const digits = input.phone.replace(/[^\d+]/g, "");
    if (digits) return { label: "Call", href: `tel:${digits}` };
  }
  if (input.openDealId) return { label: "Open shop", href: `/deals/${input.openDealId}` };
  return { label: "Open", href: input.href };
}

function partyWhy(input: {
  lastTouchDays: number | null;
  openDeals: number;
  inForce: number;
  healthBand?: "high" | "medium" | "low" | null;
}): string {
  const bits: string[] = [];
  if (input.healthBand === "high") bits.push("Health flagged");
  if (input.lastTouchDays == null) bits.push("No logged touch");
  else if (input.lastTouchDays >= 90) bits.push("No touch in 90+ days");
  else if (input.lastTouchDays >= 45) bits.push("Quiet 45+ days");
  else bits.push(`Last touch ${relativeTouchLabel(input.lastTouchDays)}`);
  if (input.openDeals > 0) bits.push(`${input.openDeals} open shop${input.openDeals === 1 ? "" : "s"}`);
  if (input.inForce > 0) bits.push(`${input.inForce} in-force`);
  return bits.slice(0, 3).join(" · ");
}

export function presentPartyCard(
  row: PartyListRow,
  kind: "contact" | "account",
  extra: {
    open?: OpenDealSignal;
    health?: HealthChipView | null;
    asOf: Date;
  },
): BookGlanceCard {
  const href = kind === "contact" ? `/contacts/${row.id}` : `/accounts/${row.id}`;
  const lastTouchDays = daysSinceTouch(row.lastActivityAt, extra.asOf);
  const openDeals = extra.open?.count ?? 0;
  const heat = partyAttentionHeat({
    lastTouchDays,
    healthBand: extra.health?.band ?? null,
    inForce: row.activePolicyCount,
    openDeals,
  });
  const hint = contactHealthScore({
    policyCount: row.policyCount,
    lastActivityAt: row.lastActivityAt,
    now: extra.asOf,
  });
  const title = partyTitle(row, kind);
  return {
    id: row.id,
    surface: kind === "contact" ? "contacts" : "accounts",
    href,
    title,
    subtitle: row.clientStatus || undefined,
    heat,
    column: partyColumnForHeat(heat),
    health: extra.health ?? null,
    healthHint: extra.health ? null : hint,
    riskBand: extra.health?.band ?? (hint.level === "red" ? "high" : hint.level === "yellow" ? "medium" : "low"),
    glance: [
      { id: "touch", label: "Last touch", value: relativeTouchLabel(lastTouchDays) },
      {
        id: "open",
        label: "Open shops",
        value: String(openDeals),
        tone: openDeals > 0 ? "hot" : "ok",
      },
      {
        id: "policies",
        label: kind === "account" ? "Book" : "In-force",
        value: String(row.activePolicyCount),
        tone: row.activePolicyCount > 0 ? "ok" : "cool",
      },
    ],
    why: partyWhy({
      lastTouchDays,
      openDeals,
      inForce: row.activePolicyCount,
      healthBand: extra.health?.band ?? null,
    }),
    primaryAction: primaryPartyAction({
      heat,
      phone: row.phone,
      openDealId: extra.open?.dealId ?? null,
      href,
    }),
    tags: row.tags ?? [],
    phone: row.phone,
    email: row.email,
    lastTouchDays,
    flags: {
      client: /client/i.test(row.clientStatus ?? "") && !/former/i.test(row.clientStatus ?? ""),
      openShops: openDeals,
      inForce: row.activePolicyCount,
      writtenBook: row.activePolicyCount > 0,
    },
    hay: haystack([
      title,
      row.name,
      row.legalName,
      row.dba,
      row.firstName,
      row.lastName,
      row.email,
      row.phone,
      row.city,
      row.industry,
      row.source,
      row.clientStatus,
      ...(row.tags ?? []),
    ]),
  };
}

export function presentCarrierCard(
  row: CarrierListRow,
  signal: CarrierMarketSignal,
  asOf: Date,
): BookGlanceCard {
  const lastUse = signal.lastUseAt ?? row.lastContactedAt ?? null;
  const lastTouchDays = daysSinceTouch(lastUse, asOf);
  const inactive =
    row.deskStatus?.toLowerCase() === "inactive" ||
    (row.deskStatus == null && row.active === false);
  const heat = carrierMarketHeat({
    rateable: signal.rateable,
    skipDecline: signal.skipDecline,
    inactive,
    limited: signal.limited,
  });
  const column = carrierColumnFor({
    heat,
    skipDecline: signal.skipDecline,
    rateable: signal.rateable,
  });
  const appetite = signal.appetiteLines.slice(0, 3).join(" · ") || (row.writtenLines ?? []).slice(0, 3).join(" · ");
  const skipCue =
    signal.skipWhy ||
    signal.dontWrite[0] ||
    (signal.declineCount > 0 ? `${signal.declineCount} recent declines` : null) ||
    (inactive ? "Inactive on desk" : null);
  const whyBits = [
    column === "rateable" ? "Rateable" : column === "limited" ? "Limited appetite" : "Skip / decline",
    appetite || null,
    skipCue && column !== "rateable" ? skipCue : lastTouchDays != null ? `Last use ${relativeTouchLabel(lastTouchDays)}` : "No recent use",
  ].filter(Boolean);
  return {
    id: row.id,
    surface: "carriers",
    href: `/carriers/${row.id}`,
    title: row.name,
    subtitle: row.agencyCode || undefined,
    heat,
    column,
    health: null,
    healthHint: null,
    riskBand: column === "skip" ? "high" : column === "limited" ? "medium" : "low",
    glance: [
      {
        id: "rateable",
        label: "Status",
        value: column === "rateable" ? "Rateable" : column === "limited" ? "Limited" : "Skip",
        tone: column === "skip" ? "skip" : column === "limited" ? "cool" : "ok",
      },
      {
        id: "lines",
        label: "Appetite",
        value: appetite || "—",
      },
      {
        id: "touch",
        label: "Last use",
        value: relativeTouchLabel(lastTouchDays),
      },
      {
        id: "policies",
        label: "Book",
        value: String(signal.activePolicies),
        tone: signal.activePolicies > 0 ? "ok" : "cool",
      },
    ],
    why: whyBits.join(" · "),
    primaryAction:
      column === "skip"
        ? { label: "See why", href: `/carriers/${row.id}` }
        : { label: "Open market", href: `/carriers/${row.id}` },
    tags: row.tags ?? [],
    lastTouchDays,
    flags: {
      writtenBook: signal.activePolicies > 0,
    },
    hay: haystack([
      row.name,
      row.agencyCode,
      ...(row.writtenLines ?? []),
      row.appetiteNotes,
      row.dontWriteNotes,
      ...signal.appetiteLines,
      ...signal.dontWrite,
      signal.skipWhy,
      ...(row.tags ?? []),
    ]),
  };
}

export type PolicyListRow = {
  id: string;
  policyNumber: string;
  displayName: string;
  status: string;
  lineOfBusiness: string;
  premium?: string | number | null;
  expirationDate: Date | string;
  updatedAt?: Date | string | null;
  tags?: string[] | null;
  partyName?: string | null;
  carrierName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type PolicyNeedSignal = {
  openClaims: number;
  pendingEndorsements: number;
  missingDocs: number;
};

export function presentPolicyCard(
  row: PolicyListRow,
  needs: PolicyNeedSignal,
  asOf: Date,
): BookGlanceCard {
  const lastTouchDays = daysSinceTouch(row.updatedAt, asOf);
  const daysUntil = daysUntilDate(row.expirationDate, asOf);
  const lapsed = /lapse|cancel|expired|terminated/i.test(row.status);
  const attention = policyAttention({
    daysUntil,
    lastTouchDays,
    lapsed,
    openClaims: needs.openClaims,
    pendingEndorsements: needs.pendingEndorsements,
    missingDocs: needs.missingDocs,
  });
  let action = { label: "Open", href: `/policies/${row.id}` };
  if (needs.openClaims > 0) {
    action = { label: "Claims", href: `/policies/${row.id}?tab=claims` };
  } else if (needs.missingDocs > 0) {
    action = { label: "Docs", href: `/policies/${row.id}?tab=documents` };
  } else if (needs.pendingEndorsements > 0) {
    action = { label: "Endorse", href: `/policies/${row.id}?tab=endorsements` };
  } else if (attention.column === "now" && daysUntil != null && daysUntil < 30) {
    action = { label: "Renew", href: `/renewals?policy=${row.id}` };
  }
  return {
    id: row.id,
    surface: "policies",
    href: `/policies/${row.id}`,
    title: row.displayName || row.policyNumber,
    subtitle: row.status,
    heat: attention.heat,
    column: attention.column,
    health: null,
    healthHint:
      attention.heat === "hot"
        ? { level: "red", tip: attention.why }
        : attention.heat === "cooling"
          ? { level: "yellow", tip: attention.why }
          : { level: "green", tip: attention.why },
    riskBand: attention.heat === "hot" ? "high" : attention.heat === "cooling" ? "medium" : "low",
    glance: [],
    why: attention.why,
    primaryAction: action,
    tags: row.tags ?? [],
    phone: row.phone,
    email: row.email,
    lastTouchDays,
    flags: {
      renewalSoon: daysUntil != null && daysUntil < 60,
      silent: lastTouchDays == null || lastTouchDays >= 21,
      needsCare: attention.column === "now",
      lapsed,
      writtenBook: !lapsed,
    },
    hay: haystack([
      row.displayName,
      row.policyNumber,
      row.lineOfBusiness,
      row.status,
      row.partyName,
      row.carrierName,
      ...(row.tags ?? []),
    ]),
  };
}
