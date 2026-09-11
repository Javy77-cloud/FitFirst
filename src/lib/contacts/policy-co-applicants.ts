/**
 * Policy-scoped co-applicant reverse lookup (not contact↔contact M2M UI).
 * Labels:
 *  - "Co-Applied With" — this contact holds policy/deal; other is co-applicant
 *  - "Co-Applies With" — this contact is the co-applicant on the other's book
 *
 * Business policy rows reuse this for the singular `coAppliesWith` prop —
 * named-insured / secondaryNamedInsured only; never contact_coapplicants.
 */

import { namesMatch, normalizeName, splitNamedInsured } from "@/lib/lifecycle/lead-match";

export type PolicyCoApplicantLink = {
  contactId: string;
  firstName: string;
  lastName: string;
  relation: "co-applied-with" | "co-applies-with";
};

export type NamedInsuredContact = {
  id: string;
  firstName: string;
  lastName: string;
};

export function policyCoApplicantLabel(relation: PolicyCoApplicantLink["relation"]): string {
  return relation === "co-applied-with" ? "Co-Applied With:" : "Co-Applies With:";
}

export function formatPolicyCoApplicantName(c: {
  firstName: string;
  lastName: string;
}): string {
  return `${c.lastName}, ${c.firstName}`;
}

/**
 * Auto-populated reverse lookup from policy/deal bind relationships.
 * `ownsPolicies` decides the label direction; no manual entry.
 */
export function buildPolicyCoApplicantLinks(input: {
  contactId: string;
  linkedContacts: NamedInsuredContact[];
  ownsPolicies: boolean;
}): PolicyCoApplicantLink[] {
  const out: PolicyCoApplicantLink[] = [];
  const seen = new Set<string>();
  for (const row of input.linkedContacts) {
    if (row.id === input.contactId || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({
      contactId: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      relation: input.ownsPolicies ? "co-applied-with" : "co-applies-with",
    });
  }
  return out;
}

function secondaryNameMatches(contact: NamedInsuredContact, secondaryRaw: string): boolean {
  const raw = normalizeName(secondaryRaw);
  if (!raw) return false;
  const parsed = splitNamedInsured(secondaryRaw);
  if (namesMatch(contact, parsed)) return true;
  const flat = normalizeName(`${contact.firstName} ${contact.lastName}`);
  const swapped = normalizeName(`${contact.lastName} ${contact.firstName}`);
  const comma = normalizeName(`${contact.lastName}, ${contact.firstName}`);
  return raw === flat || raw === swapped || raw === comma;
}

/**
 * Resolve co-applicant contacts from policy/deal named-insured fields only.
 * Prefer secondaryNamedInsured name match against candidates; never M2M.
 */
export function namedInsuredCoApplicantContacts(input: {
  primaryContactId?: string | null;
  secondaryNamedInsured?: string | null;
  candidates: NamedInsuredContact[];
}): NamedInsuredContact[] {
  const secondary = (input.secondaryNamedInsured ?? "").trim();
  if (!secondary) return [];
  const primaryId = input.primaryContactId ?? null;
  const out: NamedInsuredContact[] = [];
  const seen = new Set<string>();
  for (const row of input.candidates) {
    if (primaryId && row.id === primaryId) continue;
    if (seen.has(row.id)) continue;
    if (!secondaryNameMatches(row, secondary)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

/**
 * Business policy row prop: singular clickable coAppliesWith from policy links.
 * Uses buildPolicyCoApplicantLinks so Contact + Business share one reverse-lookup.
 */
export function coAppliesWithFromPolicy(input: {
  /** Stable id to exclude (policy primary contact, or empty sentinel). */
  excludeContactId: string;
  linkedContacts: NamedInsuredContact[];
  /** Business holds the commercial policy → co-applied-with semantics upstream. */
  ownsPolicies?: boolean;
}): { id: string; label: string } | null {
  const links = buildPolicyCoApplicantLinks({
    contactId: input.excludeContactId,
    linkedContacts: input.linkedContacts,
    ownsPolicies: input.ownsPolicies ?? true,
  });
  const hit = links[0];
  if (!hit) return null;
  return {
    id: hit.contactId,
    label: formatPolicyCoApplicantName(hit),
  };
}
