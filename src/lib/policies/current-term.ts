/**
 * Current term is law.
 *
 * A term is Current only when its effective date is on or before today
 * (America/New_York) and its expiration date is after today. A later term
 * that has not started is Upcoming. If the latest term has expired and
 * nothing has started, the policy is not in force.
 *
 * Stored term dates are calendar days. A `YYYY-MM-DD` string, or a timestamp
 * at UTC midnight or noon, keeps that calendar day. "Today" is always the
 * Eastern calendar day, including an evening after 8 PM (UTC has already
 * rolled forward).
 */

import { etDateKey } from "@/lib/time/et";
import { normalizePolicyStatus } from "@/lib/policy/status";

export const RENEWAL_WINDOW_DAYS = 90;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type TermCandidate = {
  id?: string | null;
  role?: string | null;
  effective?: Date | string | null;
  expiration?: Date | string | null;
  premium?: string | number | null;
  source?: string | null;
  sourceDocumentId?: string | null;
  lineOfBusiness?: string | null;
};

export type CurrentTermInput = {
  status?: string | null;
  lineOfBusiness?: string | null;
  policyNumber?: string | null;
  carrierName?: string | null;
  namedInsured?: string | null;
  effectiveDate?: Date | string | null;
  expirationDate?: Date | string | null;
  renewalDate?: Date | string | null;
  premium?: string | number | null;
  sourceDocumentId?: string | null;
  terms?: readonly TermCandidate[] | null;
};

export type TermSnapshot = {
  id: string | null;
  role: string | null;
  effective: string;
  expiration: string;
  premium: string | null;
  sourceDocumentId: string | null;
  lineOfBusiness: string | null;
  origin: "term" | "policy";
};

export type DeskTermBand =
  | "in_force"
  | "renewal_window"
  | "lapsed"
  | "cancelled"
  | "expired"
  | "non_renewed"
  | "upcoming"
  | "pending"
  | "bound"
  | "unpublished";

export type CurrentTermResolution = {
  current: TermSnapshot | null;
  upcoming: TermSnapshot | null;
  prior: TermSnapshot | null;
  /** Distinct date windows that all contain today. More than one is a data error. */
  currentCandidates: TermSnapshot[];
  ambiguous: boolean;
  /** Signed Eastern calendar days until `bookExpiration`. Null when there is no date. */
  daysLeft: number | null;
  /** Expiration the desk should count from: current, else the latest expired term. */
  bookExpiration: string | null;
  bookEffective: string | null;
  band: DeskTermBand;
  countsAsInForce: boolean;
  namedInsured: string | null;
  namedInsuredRaw: string | null;
  lineOfBusiness: string | null;
  carrierName: string | null;
  policyNumber: string | null;
  /** Client-staying anchor: the current term's expiration. Null when nothing is current. */
  renewalAnchor: string | null;
};

const BOOK_STATUSES = new Set(["active", "bound", "pending"]);

/** Calendar day a stored term date was meant to be. Never `toISOString().slice`. */
export function businessDateKey(value: Date | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (DATE_ONLY.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return businessDateKey(parsed);
  }
  if (Number.isNaN(value.getTime())) return null;
  const minutes = value.getUTCMinutes();
  const seconds = value.getUTCSeconds();
  const ms = value.getUTCMilliseconds();
  const hour = value.getUTCHours();
  const dateOnlyStamp = minutes === 0 && seconds === 0 && ms === 0 && (hour === 0 || hour === 12);
  if (dateOnlyStamp) {
    const y = value.getUTCFullYear();
    const mo = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return etDateKey(value);
}

/** Whole calendar days from `fromKey` to `toKey` (negative when `toKey` is earlier). */
export function calendarDaysBetween(fromKey: string, toKey: string): number {
  const from = DATE_ONLY.exec(fromKey);
  const to = DATE_ONLY.exec(toKey);
  if (!from || !to) return 0;
  const start = Date.UTC(Number(from[1]), Number(from[2]) - 1, Number(from[3]));
  const end = Date.UTC(Number(to[1]), Number(to[2]) - 1, Number(to[3]));
  return Math.round((end - start) / 86_400_000);
}

/** Eastern calendar days from `asOf` until a term date. */
export function daysLeftEt(
  expiration: Date | string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  const end = businessDateKey(expiration);
  if (!end) return null;
  return calendarDaysBetween(etDateKey(asOf), end);
}

export function noonUtcFromBusinessDate(key: string): Date | null {
  const match = DATE_ONLY.exec(key);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0));
}

function titleWord(word: string): string {
  if (!word) return "";
  return word
    .split(/([-'])/)
    .map((part) => {
      if (part === "-" || part === "'") return part;
      if (!part) return "";
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function titleName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(titleWord)
    .join(" ");
}

function lettersAreCaps(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

/**
 * Named insured is First Last.
 * DEC prints `IORI DOMENIC` and `IORI, DOMENIC` become `Domenic Iori`.
 * Mixed-case names are title-cased and not reordered. Three-or-more ALL CAPS
 * tokens are title-cased in place (a business or a middle name — not guessed).
 */
export function normalizeNamedInsured(raw: string | null | undefined): string | null {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.includes(",")) {
    const [last, rest] = text.split(",", 2);
    const given = (rest ?? "").trim();
    const surname = (last ?? "").trim();
    if (!given || !surname) return titleName(text.replace(/,/g, " "));
    return titleName(`${given} ${surname}`);
  }
  const parts = text.split(" ").filter(Boolean);
  if (lettersAreCaps(text) && parts.length === 2) {
    return titleName(`${parts[1]} ${parts[0]}`);
  }
  return titleName(text);
}

export function namedInsuredOrderChanged(raw: string | null | undefined): boolean {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  const normalized = normalizeNamedInsured(text);
  if (!normalized) return false;
  return normalized.toLowerCase() !== titleName(text).toLowerCase();
}

function premiumText(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  return text || null;
}

function snapshotFrom(
  input: {
    id?: string | null;
    role?: string | null;
    effective: string;
    expiration: string;
    premium?: string | number | null;
    sourceDocumentId?: string | null;
    lineOfBusiness?: string | null;
    origin: "term" | "policy";
  },
): TermSnapshot {
  return {
    id: input.id ?? null,
    role: input.role ?? null,
    effective: input.effective,
    expiration: input.expiration,
    premium: premiumText(input.premium),
    sourceDocumentId: input.sourceDocumentId ?? null,
    lineOfBusiness: input.lineOfBusiness ?? null,
    origin: input.origin,
  };
}

function classify(effective: string, expiration: string, today: string): "current" | "upcoming" | "prior" | "invalid" {
  if (calendarDaysBetween(effective, expiration) <= 0) return "invalid";
  if (calendarDaysBetween(today, effective) > 0) return "upcoming";
  if (calendarDaysBetween(today, expiration) > 0) return "current";
  return "prior";
}

function windowKey(row: TermSnapshot): string {
  return `${row.effective}|${row.expiration}`;
}

export function deskTermBandLabel(band: DeskTermBand, policyStatus?: string | null): string {
  if (band === "in_force") {
    const normalized = normalizePolicyStatus(policyStatus);
    if (normalized === "active") return "Active";
    if (!normalized) return "In force";
    return "In force";
  }
  if (band === "renewal_window") return "Renewal window";
  if (band === "lapsed") return "Lapsed";
  if (band === "cancelled") return "Cancelled";
  if (band === "expired") return "Expired";
  if (band === "non_renewed") return "Non-renewed";
  if (band === "upcoming") return "Upcoming";
  if (band === "pending") return "Pending";
  if (band === "bound") return "Bound";
  return "Unpublished";
}

export function bandIsOffBook(band: DeskTermBand): boolean {
  return band === "lapsed" || band === "cancelled" || band === "expired" || band === "non_renewed";
}

function deriveBand(
  status: string | null | undefined,
  current: TermSnapshot | null,
  upcoming: TermSnapshot | null,
  daysLeft: number | null,
): DeskTermBand {
  const normalized = normalizePolicyStatus(status);
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "non_renewed") return "non_renewed";
  if (normalized === "lapsed") return "lapsed";
  if (normalized === "unpublished") return "unpublished";
  if (normalized === "expired") return "expired";
  const onBook = BOOK_STATUSES.has(normalized) || normalized === "";
  if (current && onBook) {
    if (daysLeft != null && daysLeft <= RENEWAL_WINDOW_DAYS) return "renewal_window";
    if (normalized === "bound") return "bound";
    if (normalized === "pending") return "pending";
    return "in_force";
  }
  if (!onBook) return "expired";
  if (upcoming) return "upcoming";
  if (normalized === "bound") return "bound";
  if (normalized === "pending") return "pending";
  return "expired";
}

export function resolveCurrentTerm(
  input: CurrentTermInput,
  asOf: Date = new Date(),
): CurrentTermResolution {
  const today = etDateKey(asOf);
  const candidates: TermSnapshot[] = [];

  for (const term of input.terms ?? []) {
    const effective = businessDateKey(term.effective);
    const expiration = businessDateKey(term.expiration);
    if (!effective || !expiration) continue;
    if (classify(effective, expiration, today) === "invalid") continue;
    candidates.push(
      snapshotFrom({
        id: term.id,
        role: term.role,
        effective,
        expiration,
        premium: term.premium,
        sourceDocumentId: term.sourceDocumentId,
        lineOfBusiness: term.lineOfBusiness,
        origin: "term",
      }),
    );
  }

  const policyEffective = businessDateKey(input.effectiveDate);
  const policyExpiration = businessDateKey(input.expirationDate);
  if (policyExpiration) {
    const effective = policyEffective ?? "0001-01-01";
    if (classify(effective, policyExpiration, today) !== "invalid") {
      const policySnap = snapshotFrom({
        effective,
        expiration: policyExpiration,
        premium: input.premium,
        sourceDocumentId: input.sourceDocumentId,
        lineOfBusiness: input.lineOfBusiness,
        origin: "policy",
        role: "policy",
      });
      const duplicate = candidates.some((row) => windowKey(row) === windowKey(policySnap));
      if (!duplicate) candidates.push(policySnap);
    }
  }

  const currentPool: TermSnapshot[] = [];
  const upcomingPool: TermSnapshot[] = [];
  const priorPool: TermSnapshot[] = [];
  for (const row of candidates) {
    const kind = classify(row.effective, row.expiration, today);
    if (kind === "current") currentPool.push(row);
    else if (kind === "upcoming") upcomingPool.push(row);
    else if (kind === "prior") priorPool.push(row);
  }

  const distinctCurrent = new Map<string, TermSnapshot>();
  for (const row of currentPool) {
    const key = windowKey(row);
    const prev = distinctCurrent.get(key);
    if (!prev || (prev.origin === "policy" && row.origin === "term")) distinctCurrent.set(key, row);
  }
  const currentCandidates = [...distinctCurrent.values()].sort((a, b) =>
    a.effective < b.effective ? 1 : a.effective > b.effective ? -1 : 0,
  );
  const current = currentCandidates[0] ?? null;
  const upcoming =
    [...upcomingPool].sort((a, b) => (a.effective < b.effective ? -1 : a.effective > b.effective ? 1 : 0))[0] ??
    null;
  const prior =
    [...priorPool].sort((a, b) => (a.expiration < b.expiration ? 1 : a.expiration > b.expiration ? -1 : 0))[0] ??
    null;

  const bookExpiration = current?.expiration ?? prior?.expiration ?? policyExpiration;
  const bookEffective = current?.effective ?? prior?.effective ?? policyEffective;
  const daysLeft = bookExpiration ? calendarDaysBetween(today, bookExpiration) : null;
  const currentDays = current ? calendarDaysBetween(today, current.expiration) : null;
  const band = deriveBand(input.status, current, upcoming, currentDays);
  const namedRaw = (input.namedInsured ?? "").trim() || null;

  return {
    current,
    upcoming,
    prior,
    currentCandidates,
    ambiguous: currentCandidates.length > 1,
    daysLeft,
    bookExpiration,
    bookEffective,
    band,
    countsAsInForce: band === "in_force" || band === "renewal_window" || band === "bound" || band === "pending",
    namedInsured: normalizeNamedInsured(namedRaw),
    namedInsuredRaw: namedRaw,
    lineOfBusiness: current?.lineOfBusiness ?? input.lineOfBusiness ?? null,
    carrierName: input.carrierName ?? null,
    policyNumber: input.policyNumber ?? null,
    renewalAnchor: current?.expiration ?? null,
  };
}

/** Coverage / compare: the term row that is the resolved current window, or null. */
export function matchingCurrentTerm<T extends { id?: string | null; termEffective?: Date | string | null; termExpiration?: Date | string | null; effective?: Date | string | null; expiration?: Date | string | null }>(
  terms: readonly T[],
  resolution: CurrentTermResolution,
): T | null {
  if (!resolution.current) return null;
  if (resolution.current.id) {
    const byId = terms.find((term) => term.id === resolution.current?.id);
    if (byId) return byId;
  }
  return (
    terms.find((term) => {
      const effective = businessDateKey(term.termEffective ?? term.effective);
      const expiration = businessDateKey(term.termExpiration ?? term.expiration);
      return effective === resolution.current?.effective && expiration === resolution.current?.expiration;
    }) ?? null
  );
}
