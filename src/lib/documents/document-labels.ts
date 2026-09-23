/**
 * Document display meta: attach types (from policy-family) + Prior/Current/Renewal/Archive term role.
 * Term role is stored on documents.tags as `term_role:<value>` (no schema migration).
 */

import { DOCUMENT_CATEGORIES } from "@/lib/desk/policy-family";

export const POLICY_ATTACH_DOC_TYPES = DOCUMENT_CATEGORIES;

export type PolicyAttachDocType = (typeof POLICY_ATTACH_DOC_TYPES)[number]["value"];

export const DOCUMENT_TERM_ROLES = [
  { value: "prior", label: "Prior term" },
  { value: "current", label: "Current term" },
  { value: "renewal", label: "Renewal / upcoming term" },
  { value: "archive", label: "Archive" },
] as const;

/** Roles Fill Compare may read — archive is never a compare side. */
export const COMPARE_TERM_ROLES = ["prior", "current", "renewal"] as const;
export type CompareTermRole = (typeof COMPARE_TERM_ROLES)[number];

export function isCompareTermRole(value: string): value is CompareTermRole {
  return (COMPARE_TERM_ROLES as readonly string[]).includes(value);
}

export type DocumentTermRole = (typeof DOCUMENT_TERM_ROLES)[number]["value"];

export const TERM_ROLE_TAG_PREFIX = "term_role:";

const TERM_ROLE_VALUES = new Set<string>(DOCUMENT_TERM_ROLES.map((r) => r.value));

export function isDocumentTermRole(value: string): value is DocumentTermRole {
  return TERM_ROLE_VALUES.has(value);
}

export function isPolicyAttachDocType(value: string): value is PolicyAttachDocType {
  return POLICY_ATTACH_DOC_TYPES.some((row) => row.value === value);
}

export function policyAttachDocTypeLabel(docType: string): string {
  const match = POLICY_ATTACH_DOC_TYPES.find((row) => row.value === docType);
  return match?.label ?? docType;
}

export function termRoleFromTags(tags: string[] | null | undefined): DocumentTermRole | null {
  for (const tag of tags ?? []) {
    if (!tag.startsWith(TERM_ROLE_TAG_PREFIX)) continue;
    const value = tag.slice(TERM_ROLE_TAG_PREFIX.length);
    if (isDocumentTermRole(value)) return value;
  }
  return null;
}

export function termRoleLabel(role: DocumentTermRole | null | undefined): string | null {
  if (!role) return null;
  return DOCUMENT_TERM_ROLES.find((row) => row.value === role)?.label ?? role;
}

/** Replace any existing term_role:* tag; pass null to clear. */
export function tagsWithTermRole(
  tags: string[] | null | undefined,
  role: DocumentTermRole | null,
): string[] {
  const next = (tags ?? []).filter((tag) => !tag.startsWith(TERM_ROLE_TAG_PREFIX));
  if (role) next.push(`${TERM_ROLE_TAG_PREFIX}${role}`);
  return next;
}

/** Tags safe for generic UI chips (hides internal term_role:*). */
export function displayDocumentTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter(
    (tag) => !tag.startsWith(TERM_ROLE_TAG_PREFIX) && !tag.startsWith("term_months:"),
  );
}

export const TERM_MONTHS_TAG_PREFIX = "term_months:";

export function termMonthsFromTags(tags: string[] | null | undefined): number | null {
  for (const tag of tags ?? []) {
    if (!tag.startsWith(TERM_MONTHS_TAG_PREFIX)) continue;
    const n = Number(tag.slice(TERM_MONTHS_TAG_PREFIX.length));
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return null;
}

/** Replace any existing term_months:* tag; pass null to clear. */
export function tagsWithTermMonths(
  tags: string[] | null | undefined,
  months: number | null,
): string[] {
  const next = (tags ?? []).filter((tag) => !tag.startsWith(TERM_MONTHS_TAG_PREFIX));
  if (months != null && Number.isFinite(months) && months > 0) {
    next.push(`${TERM_MONTHS_TAG_PREFIX}${Math.round(months)}`);
  }
  return next;
}

export function formatTermLengthMonths(months: number | null | undefined): string | null {
  if (months == null || !Number.isFinite(months) || months <= 0) return null;
  const n = Math.round(months);
  return n === 1 ? "1 month" : `${n} months`;
}

/** Whole months between effective and expiration (noon-UTC safe). */
export function monthsBetweenTermDates(
  effective: Date | null | undefined,
  expiration: Date | null | undefined,
): number | null {
  if (!effective || !expiration) return null;
  const a = effective.getTime();
  const b = expiration.getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  const days = (b - a) / (1000 * 60 * 60 * 24);
  // Prefer common policy lengths
  if (days >= 350 && days <= 380) return 12;
  if (days >= 170 && days <= 195) return 6;
  if (days >= 85 && days <= 100) return 3;
  return Math.max(1, Math.round(days / 30.4375));
}

export type TermRoleFlipDoc = {
  id: string;
  tags?: string[] | null;
  createdAt?: Date | string | null;
};

export type TermRoleFlipChange = {
  id: string;
  from: DocumentTermRole;
  to: DocumentTermRole;
};

function flipCreatedAtMs(doc: TermRoleFlipDoc): number {
  if (!doc.createdAt) return 0;
  const t = new Date(doc.createdAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

function newestFirst(docs: TermRoleFlipDoc[]): TermRoleFlipDoc[] {
  return [...docs].sort(
    (a, b) => flipCreatedAtMs(b) - flipCreatedAtMs(a) || a.id.localeCompare(b.id),
  );
}

/**
 * Day-of term-start role flip. Idempotent when no `renewal` remains:
 * renewal → current, current → prior, other priors (+ extras) → archive.
 * Fill Compare never reads archive.
 */
export function planTermStartRoleFlip(
  docs: readonly TermRoleFlipDoc[],
): TermRoleFlipChange[] {
  const renewals = newestFirst(docs.filter((doc) => termRoleFromTags(doc.tags) === "renewal"));
  if (renewals.length === 0) return [];

  const currents = newestFirst(docs.filter((doc) => termRoleFromTags(doc.tags) === "current"));
  const priors = newestFirst(docs.filter((doc) => termRoleFromTags(doc.tags) === "prior"));

  const keepCurrentId = renewals[0]!.id;
  const priorPool = [...currents, ...renewals.slice(1), ...priors];
  const keepPriorId = priorPool[0]?.id ?? null;

  const changes: TermRoleFlipChange[] = [];
  for (const doc of docs) {
    const from = termRoleFromTags(doc.tags);
    if (!from || from === "archive") continue;
    let to: DocumentTermRole;
    if (doc.id === keepCurrentId) to = "current";
    else if (keepPriorId && doc.id === keepPriorId) to = "prior";
    else if (from === "renewal" || from === "current" || from === "prior") to = "archive";
    else continue;
    if (to !== from) changes.push({ id: doc.id, from, to });
  }
  return changes;
}

export function shortTermRoleLabel(role: DocumentTermRole): string {
  if (role === "prior") return "Prior";
  if (role === "current") return "Current";
  if (role === "renewal") return "Renewal";
  return "Archive";
}
