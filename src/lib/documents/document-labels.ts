/**
 * Document display meta: attach types (from policy-family) + Prior/Current/Renewal term role.
 * Term role is stored on documents.tags as `term_role:<value>` (no schema migration).
 */

import { DOCUMENT_CATEGORIES } from "@/lib/desk/policy-family";

export const POLICY_ATTACH_DOC_TYPES = DOCUMENT_CATEGORIES;

export type PolicyAttachDocType = (typeof POLICY_ATTACH_DOC_TYPES)[number]["value"];

export const DOCUMENT_TERM_ROLES = [
  { value: "prior", label: "Prior term" },
  { value: "current", label: "Current term" },
  { value: "renewal", label: "Renewal / upcoming term" },
] as const;

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
  return (tags ?? []).filter((tag) => !tag.startsWith(TERM_ROLE_TAG_PREFIX));
}
