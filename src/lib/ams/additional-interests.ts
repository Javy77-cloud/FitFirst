import {
  appointmentLine,
  COMMERCIAL_INTEREST_KINDS,
  INTEREST_KINDS,
  interestKindLabel,
  isCertifiableLine,
  isInterestKind,
  isPersonalLinesCode,
  PERSONAL_INTEREST_KINDS,
  type InterestKind,
} from "@/lib/domain-ams";

export type InterestDraft = {
  kind: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  loanNumber?: string | null;
  clause?: string | null;
  notes?: string | null;
};

export function isPersonalLinesPolicy(policy: {
  contactId?: string | null;
  lineOfBusiness: string;
}): boolean {
  return Boolean(policy.contactId) && isPersonalLinesCode(policy.lineOfBusiness);
}

export function canHoldInterests(policy: {
  contactId?: string | null;
  accountId?: string | null;
  lineOfBusiness: string;
}): boolean {
  if (isPersonalLinesPolicy(policy)) return true;
  return Boolean(policy.accountId) && isCertifiableLine(appointmentLine(policy.lineOfBusiness));
}

export function allowedInterestKinds(policy: {
  contactId?: string | null;
  accountId?: string | null;
  lineOfBusiness: string;
}): readonly InterestKind[] {
  if (isPersonalLinesPolicy(policy)) return PERSONAL_INTEREST_KINDS;
  if (canHoldInterests(policy)) return COMMERCIAL_INTEREST_KINDS;
  return [];
}

export function formatHolderAddress(row: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const cityState = [row.city, row.state].filter(Boolean).join(", ");
  const line2 = [cityState, row.zip].filter(Boolean).join(" ");
  return [row.address, line2].filter(Boolean).join("\n");
}

export function missingInterestFields(input: InterestDraft): string[] {
  const missing: string[] = [];
  if (!isInterestKind(input.kind)) missing.push("Interest type");
  if (!input.name.trim()) missing.push("Name");
  return missing;
}

export function validateInterestDraft(
  input: InterestDraft,
): { ok: true; kind: InterestKind; name: string } | { ok: false; error: string } {
  const missing = missingInterestFields(input);
  if (missing.length > 0) return { ok: false, error: `Required: ${missing.join(", ")}.` };
  return { ok: true, kind: input.kind as InterestKind, name: input.name.trim() };
}

export function formatInterestLine(row: {
  kind: string;
  name: string;
  loanNumber?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  const place = [row.city, row.state].filter(Boolean).join(", ");
  const bits = [interestKindLabel(row.kind), row.name];
  if (row.loanNumber) bits.push(`loan ${row.loanNumber}`);
  if (place) bits.push(place);
  return bits.join(" · ");
}

export { INTEREST_KINDS, interestKindLabel };
