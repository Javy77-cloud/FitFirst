import { findExistingContactMatch, type ExistingContactRow } from "@/lib/crm/existing-contact-match";
import { fitFirstMatchId } from "./match-id";

export const HEALTHSHERPA_MATCH_KINDS = [
  "hs_source_id",
  "fitfirst_id",
  "email",
  "phone",
  "name",
  "none",
] as const;

export type HealthSherpaMatchKind = (typeof HEALTHSHERPA_MATCH_KINDS)[number];
export type HealthSherpaMatchStatus = "linked" | "needs_review" | "unmatched";

export type HealthSherpaMatchBookRow = ExistingContactRow & {
  source?: string | null;
  sourceId?: string | null;
};

export type HealthSherpaMatchIncoming = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  middleName?: string | null;
  hsContactId?: string | null;
  externalId?: string | null;
};

export type HealthSherpaContactMatch = {
  kind: HealthSherpaMatchKind;
  contact: HealthSherpaMatchBookRow | null;
};

/** HS sourceId, FitFirst UUID, exact email, or exact phone — safe to auto-link. */
export function isStrongHealthSherpaMatch(kind: HealthSherpaMatchKind): boolean {
  return kind === "hs_source_id" || kind === "fitfirst_id" || kind === "email" || kind === "phone";
}

export function healthSherpaMatchStatus(kind: HealthSherpaMatchKind): HealthSherpaMatchStatus {
  if (isStrongHealthSherpaMatch(kind)) return "linked";
  if (kind === "name") return "needs_review";
  return "unmatched";
}

/**
 * Classify an inbound HealthSherpa party against the book.
 * Name-only is weak — never silent merge or silent create.
 */
export function classifyHealthSherpaContactMatch(
  book: readonly HealthSherpaMatchBookRow[],
  incoming: HealthSherpaMatchIncoming,
): HealthSherpaContactMatch {
  const hsId = incoming.hsContactId?.trim() || null;
  if (hsId) {
    const hit = book.find((row) => row.source === "healthsherpa" && row.sourceId === hsId);
    if (hit) return { kind: "hs_source_id", contact: hit };
  }

  const fitFirstId = fitFirstMatchId(incoming.externalId);
  if (fitFirstId) {
    const hit = book.find((row) => row.id === fitFirstId);
    if (hit) return { kind: "fitfirst_id", contact: hit };
  }

  const identity = findExistingContactMatch(book, incoming);
  if (!identity) return { kind: "none", contact: null };
  if (identity.reason === "name") return { kind: "name", contact: identity.contact };
  return { kind: identity.reason, contact: identity.contact };
}

export function healthSherpaMatchReasonLabel(kind: HealthSherpaMatchKind | null | undefined): string {
  if (kind === "hs_source_id") return "HealthSherpa source id";
  if (kind === "fitfirst_id") return "FitFirst contact id";
  if (kind === "email") return "exact email";
  if (kind === "phone") return "exact phone";
  if (kind === "name") return "name only";
  return "no match";
}

export function healthSherpaReviewHref(enrollmentId?: string | null): string {
  const id = enrollmentId?.trim();
  return id ? `/contacts/healthsherpa-review?enrollment=${encodeURIComponent(id)}` : "/contacts/healthsherpa-review";
}
