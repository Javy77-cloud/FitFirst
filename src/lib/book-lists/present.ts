import { mailtoHref, telHref } from "@/lib/desk/contact-actions";
import { bookFamily } from "@/lib/desk/policy-line";
import { formatMoney } from "@/lib/domain";
import { homeLineLabel } from "@/lib/home/lines";
import { contactHealthScore } from "@/lib/contacts/health-score";
import type { HealthChipView } from "@/lib/health/model";
import { haystack } from "@/lib/search/live-query";
import { stackMidLine } from "@/lib/desk/stack-mid";
import { RECENT_TOUCH_DAYS } from "./kpi";
import type { BookCardAction, BookGlanceCard, BookHeat } from "./types";
import {
  carrierColumnFor,
  carrierMarketHeat,
  daysSinceTouch,
  daysUntilDate,
  glanceDate,
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
  loggedTouchAt?: Date | string | null;
  preferredLanguage?: string | null;
  language?: string | null;
  entityType?: string | null;
  einLast4?: string | null;
  linkedContactsCount?: number;
  officerContactId?: string | null;
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
  phone?: string | null;
  email?: string | null;
  portalUrl?: string | null;
  agentPortalUrl?: string | null;
  agentPhone?: string | null;
  customerServicePhone?: string | null;
  underwriterPhone?: string | null;
  underwriterEmail?: string | null;
  accountManagerEmail?: string | null;
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

function filled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function languageCue(row: PartyListRow): string | null {
  const raw = (row.preferredLanguage || row.language || "").trim();
  if (!raw) return null;
  const key = raw.toLowerCase();
  if (key === "english" || key === "en" || key === "eng") return null;
  if (key === "spanish" || key === "es" || key === "spa") return "Spanish";
  if (key === "creole" || key === "ht" || key === "haitian creole") return "Creole";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function maskedFein(last4: string | null | undefined): string | null {
  const digits = (last4 ?? "").replace(/\D/g, "").slice(-4);
  if (digits.length < 4) return null;
  return `FEIN ••••${digits}`;
}

function httpHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

function withSecondFact(why: string, fact: string | null): string {
  if (!fact) return why;
  const parts = why
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 2).join(" · ");
  return [...parts, fact].join(" · ");
}

function premiumCue(premium: string | number | null | undefined): string | null {
  if (premium == null || premium === "") return null;
  const amount = typeof premium === "string" ? Number(premium) : premium;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return formatMoney(amount);
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
    inboxCue?: string | null;
    inboxHref?: string | null;
  },
): BookGlanceCard {
  const href = kind === "contact" ? `/contacts/${row.id}` : `/accounts/${row.id}`;
  const lastTouchDays = daysSinceTouch(row.lastActivityAt, extra.asOf);
  const loggedDays =
    "loggedTouchAt" in row ? daysSinceTouch(row.loggedTouchAt, extra.asOf) : lastTouchDays;
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
  const touchCue = loggedDays == null ? "Never touched" : `Last touch ${relativeTouchLabel(loggedDays)}`;
  const language = kind === "contact" ? languageCue(row) : null;
  const openCue = openDeals > 0 ? `${openDeals} open deal${openDeals === 1 ? "" : "s"}` : null;
  const industry = row.industry?.trim() || null;
  const mid = stackMidLine([touchCue, openCue || language || (kind === "account" ? industry : null)]);
  const dba = row.dba?.trim();
  const peek =
    kind === "account"
      ? stackMidLine([
          dba && dba.toLowerCase() !== title.toLowerCase() ? `DBA ${dba}` : null,
          row.entityType?.trim() || null,
          maskedFein(row.einLast4),
          openCue || language ? industry : null,
        ])
      : null;
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
    mid,
    midHref: extra.open?.dealId ? `/deals/${extra.open.dealId}` : null,
    peek,
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
    inboxCue: extra.inboxCue ?? null,
    inboxHref: extra.inboxHref ?? null,
    flags: {
      client: /client/i.test(row.clientStatus ?? "") && !/former/i.test(row.clientStatus ?? ""),
      openShops: openDeals,
      inForce: row.activePolicyCount,
      writtenBook: row.activePolicyCount > 0,
      hasPhone: filled(row.phone),
      hasEmail: filled(row.email),
      recentTouch: loggedDays != null && loggedDays <= RECENT_TOUCH_DAYS,
      neverTouched: loggedDays == null,
      portalContact: (row.linkedContactsCount ?? 0) > 0 || Boolean(row.officerContactId),
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

function visibleCarrierLines(
  lines: string[] | null | undefined,
  settings: { writeLife: boolean; writeHealth: boolean },
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines ?? []) {
    const family = bookFamily(line);
    if (family === "life" && !settings.writeLife) continue;
    if (family === "health" && !settings.writeHealth) continue;
    const label = homeLineLabel(line).trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function carrierActions(row: CarrierListRow): BookCardAction[] {
  const actions: BookCardAction[] = [];
  const portal = httpHref(row.portalUrl) || httpHref(row.agentPortalUrl);
  if (portal) actions.push({ id: "portal", label: "Portal", href: portal, external: true });
  const phone = row.phone || row.agentPhone || row.customerServicePhone || row.underwriterPhone;
  const tel = telHref(phone);
  if (tel && phone?.trim()) actions.push({ id: "phone", label: phone.trim(), href: tel });
  const email = row.email || row.underwriterEmail || row.accountManagerEmail;
  const mail = mailtoHref(email);
  if (mail && email?.trim()) actions.push({ id: "email", label: email.trim(), href: mail });
  return actions;
}

export function presentCarrierCard(
  row: CarrierListRow,
  signal: CarrierMarketSignal,
  asOf: Date,
  settings: { writeLife: boolean; writeHealth: boolean } = { writeLife: true, writeHealth: true },
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
  const lines = visibleCarrierLines(
    signal.appetiteLines.length ? signal.appetiteLines : row.writtenLines,
    settings,
  );
  const appetite = lines.slice(0, 4).join(" · ");
  const skipCue =
    signal.skipWhy ||
    signal.dontWrite[0] ||
    (signal.declineCount > 0 ? `${signal.declineCount} recent declines` : null) ||
    (inactive ? "Inactive on desk" : null);
  const posture =
    column === "rateable" ? "Rateable" : column === "limited" ? "Limited appetite" : skipCue || "Skip";
  const useCue = lastTouchDays != null ? `Last use ${relativeTouchLabel(lastTouchDays)}` : "No recent use";
  const lineCue = appetite ? `Writes ${appetite}` : null;
  const mid = stackMidLine([posture, useCue]);
  const phone = row.phone || row.agentPhone || row.customerServicePhone || row.underwriterPhone;
  const email = row.email || row.underwriterEmail || row.accountManagerEmail;
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
    why: mid,
    mid,
    peek: lineCue,
    actions: carrierActions(row),
    primaryAction:
      column === "skip"
        ? { label: "See why", href: `/carriers/${row.id}` }
        : { label: "Open market", href: `/carriers/${row.id}` },
    tags: row.tags ?? [],
    phone,
    email,
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
  const expires = glanceDate(row.expirationDate);
  const attention = policyAttention({
    daysUntil,
    lastTouchDays,
    lapsed,
    openClaims: needs.openClaims,
    pendingEndorsements: needs.pendingEndorsements,
    missingDocs: needs.missingDocs,
    expirationLabel: expires,
  });
  const why = withSecondFact(attention.why, premiumCue(row.premium));
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
    why,
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
      family: bookFamily(row.lineOfBusiness),
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
