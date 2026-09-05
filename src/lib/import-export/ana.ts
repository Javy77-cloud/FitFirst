import { CONTACT_ID, DEAL_ID, LEAD_ID, RISK_ID } from "@/lib/fixtures/ids";
import { normalizeEmail, normalizeName } from "./csv";

export const ANA_EMAIL = "ana.dib@desk.local";
export const ANA_COV_A = 321_000;
export const ANA_CONTACT_ID = CONTACT_ID;
export const ANA_DEAL_ID = DEAL_ID;
export const ANA_LEAD_ID = LEAD_ID;
export const ANA_RISK_ID = RISK_ID;

export const ANA_PROTECTED_MESSAGE =
  "Ana Dib shop is protected. Import will not create a Policy for her or overwrite her Cov A $321,000 fixture.";

export function isAnaEmail(value: string | null | undefined): boolean {
  return normalizeEmail(value) === ANA_EMAIL;
}

export function isAnaName(first: string | null | undefined, last: string | null | undefined): boolean {
  return normalizeName(first) === "ana" && normalizeName(last) === "dib";
}

export function isAnaContactId(id: string | null | undefined): boolean {
  return id === ANA_CONTACT_ID;
}

export function isAnaDealId(id: string | null | undefined): boolean {
  return id === ANA_DEAL_ID;
}

export function isAnaLeadId(id: string | null | undefined): boolean {
  return id === ANA_LEAD_ID;
}

export function isAnaRiskId(id: string | null | undefined): boolean {
  return id === ANA_RISK_ID;
}

export function refersToAna(input: {
  id?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  contactEmail?: string | null;
}): boolean {
  if (isAnaContactId(input.id) || isAnaContactId(input.contactId)) return true;
  if (isAnaDealId(input.id) || isAnaDealId(input.dealId)) return true;
  if (isAnaLeadId(input.id) || isAnaLeadId(input.leadId)) return true;
  if (isAnaEmail(input.email) || isAnaEmail(input.contactEmail)) return true;
  if (isAnaName(input.firstName, input.lastName)) return true;
  return false;
}

export function anaPolicyBlocked(input: {
  contactId?: string | null;
  dealId?: string | null;
  contactEmail?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): boolean {
  return refersToAna(input);
}

export function anaCoverageOverwrite(nextCoverageA: number | null | undefined): boolean {
  if (nextCoverageA == null) return false;
  return nextCoverageA !== ANA_COV_A;
}
