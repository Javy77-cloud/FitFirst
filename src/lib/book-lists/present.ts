import { mailtoHref, telHref } from "@/lib/desk/contact-actions";
import { bookFamily } from "@/lib/desk/policy-line";
import { formatMoney } from "@/lib/domain";
import { homeLineLabel } from "@/lib/home/lines";
import { isOffBookStatus, policyStatusLabel } from "@/lib/policy/status";
import { businessDateKey } from "@/lib/policies/current-term";
import { daysUntilRenewal, renewsOnPhrase } from "@/lib/policies/renewal-date";
import { contactHealthScore } from "@/lib/contacts/health-score";
import type { HealthChipView } from "@/lib/health/model";
import { haystack } from "@/lib/search/live-query";
import { RECENT_TOUCH_DAYS } from "./kpi";
import type { BookCardAction, BookCardFact, BookCueColumn, BookFamily, BookGlanceCard, BookHeat } from "./types";
import {
  carrierColumnFor,
  carrierMarketHeat,
  daysSinceTouch,
  glanceDate,
  partyAttentionHeat,
  partyColumnForHeat,
  policyAttention,
  reachCue,
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
  preferredContactTime?: string | null;
  preferredContactMethod?: string | null;
  dateOfBirth?: string | null;
  entityType?: string | null;
  einLast4?: string | null;
  linkedContactsCount?: number;
  officerContactId?: string | null;
  premiumBook?: number | null;
  nearestRenewalDays?: number | null;
  primaryContactName?: string | null;
  operations?: string | null;
  operationsDescription?: string | null;
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
  premiumVolume?: number | null;
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
  premiumVolume?: number;
  bookFamilies?: BookFamily[];
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

/** Contacts Stack phone-row language column — stored preference, including English. Empty stays blank. */
function languageColumnCue(row: PartyListRow): string {
  const raw = (row.preferredLanguage || row.language || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  if (key === "english" || key === "en" || key === "eng") return "English";
  if (key === "spanish" || key === "es" || key === "spa") return "Spanish";
  if (key === "creole" || key === "ht" || key === "haitian creole") return "Creole";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Fixed Contacts Stack phone-row tracks — same four columns on every card. */
function contactStackFooter(row: PartyListRow): BookCueColumn[] {
  const statusRaw = row.clientStatus?.trim() ?? "";
  const status = !isEmptyDash(statusRaw) ? clientStatusCue(statusRaw) : null;
  return [
    { id: "language", label: languageColumnCue(row) },
    { id: "status", label: status ?? "" },
    { id: "dob", label: dobGlance(row.dateOfBirth) ?? "" },
    { id: "policies", label: String(row.policyCount ?? 0) },
  ];
}

function stackCell(raw: string | null | undefined): string {
  const value = raw?.replace(/\s+/g, " ").trim() ?? "";
  return isEmptyDash(value) ? "" : value;
}

function renewalColumnLabel(days: number | null | undefined): string {
  return renewalInFact(days)?.label ?? "";
}

/** Fixed Accounts Stack phone-row tracks — same five columns on every card. */
function accountStackFooter(row: PartyListRow): BookCueColumn[] {
  const statusRaw = row.clientStatus?.trim() ?? "";
  const status = !isEmptyDash(statusRaw) ? clientStatusCue(statusRaw) : null;
  return [
    { id: "operations", label: stackCell(row.operations) || stackCell(row.operationsDescription) },
    { id: "contact", label: stackCell(row.primaryContactName) },
    { id: "policies", label: String(row.policyCount ?? 0) },
    { id: "renewals", label: renewalColumnLabel(row.nearestRenewalDays) },
    { id: "status", label: status ?? "" },
  ];
}

function maskedFein(last4: string | null | undefined): string | null {
  const digits = (last4 ?? "").replace(/\D/g, "").slice(-4);
  if (digits.length < 4) return null;
  return `FEIN ••••${digits}`;
}

function entityCue(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const known: Record<string, string> = {
    llc: "LLC",
    inc: "Inc",
    corp: "Corp",
    corporation: "Corporation",
    partnership: "Partnership",
    sole_prop: "Sole prop",
    "sole prop": "Sole prop",
    llp: "LLP",
  };
  return known[value.toLowerCase()] ?? value;
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
  if (input.lastTouchDays == null) bits.push("Not reached");
  else if (input.lastTouchDays >= 90) bits.push("Not reached in 90+ days");
  else if (input.lastTouchDays >= 45) bits.push("Quiet 45+ days");
  else bits.push(reachCue(input.lastTouchDays));
  if (input.openDeals > 0) bits.push(`${input.openDeals} open shop${input.openDeals === 1 ? "" : "s"}`);
  if (input.inForce > 0) bits.push(`${input.inForce} in-force`);
  return bits.slice(0, 3).join(" · ");
}

function countPhrase(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Whole note when it is short. A long note keeps the first sentence or a word boundary — no mid-word ellipsis. */
function appetiteGlance(raw: string | null | undefined): string | null {
  const value = raw?.replace(/\s+/g, " ").trim();
  if (!value) return null;
  if (value.length <= 110) return value;
  const sentence = value.split(/(?<=[.!?])\s/)[0]?.trim();
  if (sentence && sentence.length < value.length && sentence.length <= 140) return sentence;
  const cut = value.slice(0, 110);
  const space = cut.lastIndexOf(" ");
  return (space > 40 ? cut.slice(0, space) : cut).trim();
}

function clipLabel(raw: string | null | undefined, max = 28): string | null {
  const value = raw?.replace(/\s+/g, " ").trim();
  if (!value) return null;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function clientStatusCue(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const key = value.toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "client") return "Client";
  if (key === "former_client") return "Former client";
  if (key === "not_a_client") return "Not a client";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** Morning / Afternoon / Evening from the contact form, with the method when it is set. */
function contactWindowCue(method: string | null | undefined, time: string | null | undefined): string | null {
  const when = time?.trim();
  const how = method?.trim();
  if (!when && !how) return null;
  if (when && how) {
    const howWord = how.toLowerCase() === "phone" ? "Call" : how;
    return `${howWord} · ${when}`;
  }
  return when || how || null;
}

/** Month/day only — an age glance, not a full birth date on the list. */
function dobGlance(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `DOB ${iso[2]}/${iso[3]}`;
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const month = us[1]!.padStart(2, "0");
    const day = us[2]!.padStart(2, "0");
    return `DOB ${month}/${day}`;
  }
  return null;
}

function renewalInFact(days: number | null | undefined): BookCardFact | null {
  if (days == null || !Number.isFinite(days)) return null;
  const tone = days <= 60 ? ("hot" as const) : undefined;
  if (days < 0) return { id: "renewal", label: `${Math.abs(days)}d past renewal`, tone: "hot" };
  return { id: "renewal", label: `Renews in ${days}d`, tone };
}

function contactWindowFact(row: PartyListRow): BookCardFact | null {
  const label = contactWindowCue(row.preferredContactMethod, row.preferredContactTime);
  return label ? { id: "window", label } : null;
}

function sourceCue(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value || value.length > 22) return null;
  const key = value.toLowerCase();
  if (key === "unknown" || key === "blank" || key === "n/a" || key === "none") return null;
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** A lone dash is a blank cell, not a fact. Real labels that contain a hyphen stay. */
function isEmptyDash(value: string | null | undefined): boolean {
  const text = value?.trim() ?? "";
  return !text || /^(?:—|–|-|n\/a|na)$/i.test(text);
}

function takeFacts(items: Array<BookCardFact | null | undefined>, limit = 8): BookCardFact[] {
  const out: BookCardFact[] = [];
  for (const item of items) {
    if (!item?.label.trim() || isEmptyDash(item.label)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
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
  const reached = reachCue(loggedDays);
  const language = kind === "contact" ? languageCue(row) : null;
  const renewalSoon = row.nearestRenewalDays != null && row.nearestRenewalDays <= 60;
  const industry = kind === "account" ? clipLabel(row.industry, 32) : null;
  const premium = row.premiumBook ?? 0;
  const primaryName = kind === "account" ? clipLabel(row.primaryContactName, 28) : null;
  const cameFrom = kind === "contact" ? sourceCue(row.source) : null;
  const entity = kind === "account" ? entityCue(row.entityType) : null;
  const dba = row.dba?.trim();
  const dbaFact =
    kind === "account" && dba && dba.toLowerCase() !== title.toLowerCase() ? `DBA ${dba}` : null;
  const fein = kind === "account" ? maskedFein(row.einLast4) : null;
  const city = kind === "contact" ? clipLabel(row.city, 24) : null;
  const status = clientStatusCue(row.clientStatus);
  const windowFact = kind === "contact" ? contactWindowFact(row) : null;
  const shopFact =
    openDeals > 0
      ? {
          id: "deals",
          label: countPhrase(openDeals, "open shop", "open shops"),
          href: extra.open?.dealId ? `/deals/${extra.open.dealId}` : null,
          tone: "hot" as const,
        }
      : null;
  const inForceFact =
    row.activePolicyCount > 0
      ? { id: "policies", label: countPhrase(row.activePolicyCount, "in-force", "in-force") }
      : null;
  const peopleFact =
    kind === "account" && (row.linkedContactsCount ?? 0) > 0
      ? {
          id: "people",
          label: countPhrase(row.linkedContactsCount ?? 0, "linked contact", "linked contacts"),
        }
      : null;
  const coreFacts = takeFacts(
    kind === "contact"
      ? [
          language ? { id: "language", label: language } : null,
          windowFact,
          city ? { id: "city", label: city } : null,
          cameFrom ? { id: "source", label: cameFrom } : null,
          status ? { id: "status", label: status } : null,
          shopFact,
          inForceFact,
          renewalInFact(row.nearestRenewalDays),
        ]
      : [
          dbaFact ? { id: "dba", label: dbaFact } : null,
          industry ? { id: "industry", label: industry } : null,
          entity ? { id: "entity", label: entity } : null,
          fein ? { id: "fein", label: fein } : null,
          primaryName ? { id: "contact", label: primaryName } : null,
          premium > 0 ? { id: "premium", label: `${formatMoney(premium)} book` } : null,
          peopleFact,
          shopFact,
          inForceFact,
          renewalInFact(row.nearestRenewalDays),
        ],
    10,
  );
  const dob = kind === "contact" ? dobGlance(row.dateOfBirth) : null;
  const facts = dob && coreFacts.length < 6 ? [...coreFacts, { id: "dob", label: dob }] : coreFacts;
  return {
    id: row.id,
    surface: kind === "contact" ? "contacts" : "accounts",
    href,
    title,
    subtitle: isEmptyDash(row.clientStatus) ? undefined : row.clientStatus?.trim() || undefined,
    heat,
    column: partyColumnForHeat(heat),
    health: extra.health ?? null,
    healthHint: extra.health ? null : hint,
    riskBand: extra.health?.band ?? (hint.level === "red" ? "high" : hint.level === "yellow" ? "medium" : "low"),
    glance: [
      { id: "touch", label: "Last contact", value: relativeTouchLabel(lastTouchDays) },
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
      lastTouchDays: loggedDays,
      openDeals,
      inForce: row.activePolicyCount,
      healthBand: extra.health?.band ?? null,
    }),
    mid: reached,
    columns: kind === "contact" ? contactStackFooter(row) : accountStackFooter(row),
    facts,
    peek: null,
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
      renewalSoon,
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

function carrierFamilies(
  lines: string[],
  extra: BookFamily[] | undefined,
  settings: { writeLife: boolean; writeHealth: boolean },
): BookFamily[] {
  const set = new Set<BookFamily>();
  const allow = (family: BookFamily) => {
    if (family === "life" && !settings.writeLife) return false;
    if (family === "health" && !settings.writeHealth) return false;
    return true;
  };
  for (const family of extra ?? []) {
    if (allow(family)) set.add(family);
  }
  for (const line of lines) {
    if (!line.trim()) continue;
    const family = bookFamily(line);
    if (allow(family)) set.add(family);
  }
  return [...set];
}

function carrierUseCue(
  days: number | null,
  kind: CarrierMarketSignal["lastUseKind"],
): string {
  if (days == null) return "No recent use";
  const when = relativeTouchLabel(days);
  if (kind === "quote") return `Quoted ${when}`;
  if (kind === "issued") return `Issued ${when}`;
  return `Last use ${when}`;
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

/** Fixed Carriers Stack tracks — same five columns on every card. */
function carrierStackFooter(
  row: CarrierListRow,
  signal: CarrierMarketSignal,
  linesLabel: string,
  status: string,
  useCue: string,
): BookCueColumn[] {
  const portal = httpHref(row.portalUrl) || httpHref(row.agentPortalUrl);
  return [
    { id: "portal", label: portal ? "Portal" : "none" },
    { id: "lines", label: linesLabel },
    { id: "policies", label: String(signal.activePolicies ?? 0) },
    { id: "status", label: status },
    { id: "last-use", label: useCue },
  ];
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
  const written = visibleCarrierLines(row.writtenLines, settings);
  const appetiteLines = visibleCarrierLines(
    signal.appetiteLines.length ? signal.appetiteLines : row.writtenLines,
    settings,
  );
  const lines = written.length ? written : appetiteLines;
  const appetite = lines.slice(0, 4).join(" · ");
  const skipCue =
    signal.skipWhy ||
    signal.dontWrite[0] ||
    (signal.declineCount > 0 ? `${signal.declineCount} recent declines` : null) ||
    (inactive ? "Inactive on desk" : null);
  const posture =
    column === "rateable" ? "Rateable" : column === "limited" ? "Limited appetite" : "Skip / decline";
  const status = column === "rateable" ? "Rateable" : column === "limited" ? "Limited" : "Skip";
  const useCue = carrierUseCue(lastTouchDays, signal.lastUseKind);
  const columns: BookCueColumn[] = [
    { id: "posture", label: posture },
    { id: "use", label: useCue },
    ...carrierStackFooter(row, signal, appetite, status, useCue),
  ];
  const premium = signal.premiumVolume ?? row.premiumVolume ?? 0;
  const appetiteNote = appetiteGlance(
    column === "skip" ? skipCue || row.dontWriteNotes : row.appetiteNotes || skipCue,
  );
  const genericNote = new Set(["not rateable", "skip-decline", "skip / decline", "limited appetite", "rateable"]);
  const lineFacts: BookCardFact[] = lines.slice(0, 6).map((label) => ({
    id: `line:${label.toLowerCase()}`,
    label,
  }));
  if (lines.length > 6) {
    lineFacts.push({ id: "lines-more", label: `+${lines.length - 6}` });
  }
  const facts = takeFacts(
    [
      ...lineFacts,
      premium > 0 ? { id: "premium", label: `${formatMoney(premium)} book` } : null,
      signal.activePolicies > 0
        ? { id: "policies", label: countPhrase(signal.activePolicies, "policy", "policies") }
        : null,
      appetiteNote && !genericNote.has(appetiteNote.toLowerCase())
        ? { id: "appetite", label: appetiteNote }
        : null,
    ],
    10,
  );
  const families = carrierFamilies(
    [...(row.writtenLines ?? []), ...signal.appetiteLines],
    signal.bookFamilies,
    settings,
  );
  const phone = row.phone || row.agentPhone || row.customerServicePhone || row.underwriterPhone;
  const email = row.email || row.underwriterEmail || row.accountManagerEmail;
  return {
    id: row.id,
    surface: "carriers",
    href: `/carriers/${row.id}`,
    title: row.name.trim() || "Untitled carrier",
    subtitle: isEmptyDash(row.agencyCode) ? undefined : row.agencyCode?.trim() || undefined,
    heat,
    column,
    health: null,
    healthHint: null,
    riskBand: column === "skip" ? "high" : column === "limited" ? "medium" : "low",
    glance: [
      {
        id: "rateable",
        label: "Status",
        value: status,
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
        value: useCue,
      },
      {
        id: "policies",
        label: "Book",
        value: String(signal.activePolicies),
        tone: signal.activePolicies > 0 ? "ok" : "cool",
      },
    ],
    why: `${posture} · ${useCue}`,
    mid: `${posture} · ${useCue}`,
    columns,
    peek: null,
    facts,
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
      families,
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
  renewalPremium?: string | number | null;
  formType?: string | null;
  policyType?: string | null;
  policySubType?: string | null;
  billingFrequency?: string | null;
  premiumFrequency?: string | null;
  expirationDate: Date | string;
  /** Stored policies.renewal_date. Blank keeps the expiration countdown. */
  renewalDate?: Date | string | null;
  updatedAt?: Date | string | null;
  tags?: string[] | null;
  partyName?: string | null;
  carrierName?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Countdown to renewalDateFor (stored renewal date, else expiration). */
  daysUntil?: number | null;
  statusLabel?: string | null;
  offBook?: boolean;
};

function moneyAmount(premium: string | number | null | undefined): number | null {
  if (premium == null || premium === "") return null;
  const amount = typeof premium === "string" ? Number(premium) : premium;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function renewalDeltaLabel(current: number | null, proposed: number | null): string | null {
  if (current == null || proposed == null) return null;
  const delta = Math.round((proposed - current) * 100) / 100;
  if (delta === 0) return null;
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatMoney(Math.abs(delta))}`;
}

function billingCue(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const key = value.toLowerCase().replace(/[\s-]+/g, "_");
  const known: Record<string, string> = {
    annual: "Annual",
    yearly: "Annual",
    monthly: "Monthly",
    quarterly: "Quarterly",
    semiannual: "Semi-annual",
    semi_annual: "Semi-annual",
  };
  return known[key] ?? value;
}

const POLICY_BAND_LABEL: Record<string, string> = {
  now: "Needs care",
  watch: "Watch",
  current: "Current",
};

export type PolicyNeedSignal = {
  openClaims: number;
  pendingEndorsements: number;
  missingDocs: number;
  /** renewal_queue stage === handled (Client staying). */
  renewalHandled?: boolean;
};

export function presentPolicyCard(
  row: PolicyListRow,
  needs: PolicyNeedSignal,
  asOf: Date,
): BookGlanceCard {
  const lastTouchDays = daysSinceTouch(row.updatedAt, asOf);
  const storedRenewal = businessDateKey(row.renewalDate);
  const daysUntil =
    row.daysUntil !== undefined
      ? row.daysUntil
      : daysUntilRenewal(
          { renewalDate: row.renewalDate, expirationDate: row.expirationDate },
          asOf,
        );
  const offBook = row.offBook ?? isOffBookStatus(row.status);
  const statusLabel = row.statusLabel ?? (row.status ? policyStatusLabel(row.status) : null);
  const expires = glanceDate(row.expirationDate);
  const renewsWhen = storedRenewal ? glanceDate(storedRenewal) : expires;
  const attention = policyAttention({
    daysUntil,
    lastTouchDays,
    lapsed: offBook,
    openClaims: needs.openClaims,
    pendingEndorsements: needs.pendingEndorsements,
    missingDocs: needs.missingDocs,
    expirationLabel: renewsWhen,
    renewalHandled: needs.renewalHandled,
    offBookLabel: statusLabel,
  });
  const why = withSecondFact(attention.why, premiumCue(row.premium));
  const insured = row.partyName?.trim() || row.displayName || row.policyNumber;
  const form =
    row.formType?.trim() || row.policySubType?.trim() || row.policyType?.trim() || "";
  const lob = homeLineLabel(row.lineOfBusiness).trim();
  const currentPremium = moneyAmount(row.premium);
  const proposedPremium = moneyAmount(row.renewalPremium);
  const renews =
    offBook || daysUntil == null
      ? null
      : daysUntil < 0
        ? `Past expiration ${Math.abs(daysUntil)}d`
        : storedRenewal
          ? renewsOnPhrase(storedRenewal)
          : `Renews in ${daysUntil}d`;
  const delta = renewalDeltaLabel(currentPremium, proposedPremium);
  const billing = billingCue(row.billingFrequency || row.premiumFrequency);
  const facts = takeFacts(
    [
      row.carrierName?.trim() ? { id: "carrier", label: row.carrierName.trim() } : null,
      form ? { id: "form", label: form } : null,
      lob && lob.toLowerCase() !== form.toLowerCase() ? { id: "lob", label: lob } : null,
      currentPremium != null ? { id: "premium", label: formatMoney(currentPremium) } : null,
      proposedPremium != null ? { id: "renewal-premium", label: `Renewal ${formatMoney(proposedPremium)}` } : null,
      delta ? { id: "delta", label: delta, tone: delta.startsWith("+") ? ("hot" as const) : ("ok" as const) } : null,
      expires
        ? {
            id: "expires",
            label: offBook && statusLabel ? statusLabel : `Expires ${expires}`,
          }
        : null,
      renews
        ? {
            id: "renews",
            label: renews,
            tone:
              !needs.renewalHandled && daysUntil != null && daysUntil < 60
                ? ("hot" as const)
                : undefined,
          }
        : null,
      statusLabel ? { id: "status", label: statusLabel } : null,
      { id: "band", label: POLICY_BAND_LABEL[attention.column] ?? "Current" },
      needs.openClaims > 0
        ? {
            id: "claims",
            label: countPhrase(needs.openClaims, "open claim", "open claims"),
            tone: "hot" as const,
          }
        : null,
      billing ? { id: "billing", label: billing } : null,
      row.policyNumber && row.policyNumber !== insured ? { id: "number", label: row.policyNumber } : null,
    ],
    12,
  );
  let action = { label: "Open", href: `/policies/${row.id}` };
  if (needs.openClaims > 0) {
    action = { label: "Claims", href: `/policies/${row.id}?tab=claims` };
  } else if (needs.missingDocs > 0) {
    action = { label: "Docs", href: `/policies/${row.id}?tab=documents` };
  } else if (needs.pendingEndorsements > 0) {
    action = { label: "Endorse", href: `/policies/${row.id}?tab=endorsements` };
  } else if (attention.column === "now" && daysUntil != null && daysUntil < 30) {
    action = { label: "Renew", href: `/policies/${row.id}` };
  }
  return {
    id: row.id,
    surface: "policies",
    href: `/policies/${row.id}`,
    title: insured,
    subtitle: statusLabel ?? row.status,
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
    facts,
    primaryAction: action,
    tags: row.tags ?? [],
    phone: row.phone,
    email: row.email,
    lastTouchDays,
    flags: {
      renewalSoon: !offBook && daysUntil != null && daysUntil >= 0 && daysUntil <= 60,
      silent: !offBook && (lastTouchDays == null || lastTouchDays >= 21),
      needsCare: attention.column === "now",
      lapsed: offBook,
      writtenBook: !offBook,
      family: bookFamily(row.lineOfBusiness),
      hasPhone: filled(row.phone),
      hasEmail: filled(row.email),
      openClaims: needs.openClaims,
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
